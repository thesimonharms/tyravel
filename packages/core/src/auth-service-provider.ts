import { ConfigRepository } from '@tyravel/config';
import {
  PayloadCipher,
  resolveSessionCipherKey,
  type CryptoConfig,
} from '@tyravel/crypto';
import { DatabaseManager } from '@tyravel/database';
import {
  AuthManager,
  SessionGuard,
  TokenGuard,
  Gate,
  OAuthManager,
  PasswordResetBroker,
  PersonalAccessTokenRepository,
  createAuthMiddleware,
  createGuestMiddleware,
  createStartSessionMiddleware,
  createVerifyCsrfTokenMiddleware,
  EloquentUserProvider,
  SessionManager,
  type AuthConfig,
  type EloquentUserProviderConfig,
  type GuardConfig,
} from '@tyravel/auth';
import { RedisManager } from '@tyravel/redis';
import { ServiceProvider } from './service-provider.js';

export class AuthServiceProvider extends ServiceProvider {
  override async boot() {
    const config = this.app.make<ConfigRepository>('config');
    const authConfig = config.get<AuthConfig>('auth');
    const database = this.app.make<DatabaseManager>('db');

    const sessionCipher = this.resolveSessionCipher();
    const sessionManager = new SessionManager(
      authConfig.session,
      database,
      this.resolveRedisManager(),
      sessionCipher,
    );

    const providers = new Map<string, EloquentUserProvider>();
    for (const [name, providerConfig] of Object.entries(
      authConfig.providers,
    ) as [string, EloquentUserProviderConfig][]) {
      providers.set(name, new EloquentUserProvider(providerConfig.model));
    }

    let sessionGuardName = authConfig.defaults.guard;
    const guardFactories: Record<string, () => import('@tyravel/auth').Guard> = {};

    const tokenTable = authConfig.tokens?.table ?? 'personal_access_tokens';
    const tokenConnection = database.connection(authConfig.tokens?.connection);
    const tokenRepository = new PersonalAccessTokenRepository(
      tokenConnection,
      tokenTable,
      'users',
      {
        prefix: authConfig.tokens?.prefix,
        prefixLength: authConfig.tokens?.prefixLength,
      },
    );
    this.app.instance('auth.tokens', tokenRepository);
    this.app.singleton(PersonalAccessTokenRepository, () => tokenRepository);

    for (const [guardName, guardConfig] of Object.entries(
      authConfig.guards,
    ) as [string, GuardConfig][]) {
      const provider = providers.get(guardConfig.provider);
      if (!provider) {
        throw new Error(`Auth provider not configured: ${guardConfig.provider}`);
      }

      if (guardConfig.driver === 'session') {
        sessionGuardName = guardName;
        guardFactories[guardName] = () =>
          new SessionGuard(
            guardName,
            provider,
            sessionManager.driver(),
            authConfig.session,
          );
      } else if (guardConfig.driver === 'token') {
        guardFactories[guardName] = () =>
          new TokenGuard(guardName, provider, tokenRepository);
      }
    }

    const auth = new AuthManager(authConfig, guardFactories, sessionGuardName);
    this.app.instance('auth', auth);
    this.app.singleton(AuthManager, () => auth);

    const gate = new Gate(this.app, authConfig.policies ?? {});
    this.app.instance('gate', gate);
    this.app.singleton(Gate, () => gate);

    const defaultProviderConfig =
      authConfig.providers.users ?? Object.values(authConfig.providers)[0];
    const defaultUserModel = defaultProviderConfig?.model;
    if (authConfig.passwords && defaultUserModel) {
      for (const [brokerName, brokerConfig] of Object.entries(
        authConfig.passwords,
      )) {
        const provider = providers.get(brokerConfig.provider);
        if (!provider) {
          continue;
        }

        const connection = database.connection(brokerConfig.connection);
        const broker = new PasswordResetBroker(connection, brokerConfig, provider);
        this.app.instance(`auth.password.${brokerName}`, broker);
        if (brokerName === 'users') {
          this.app.instance('auth.password', broker);
        }
      }
    }

    if (authConfig.oauth?.providers && defaultUserModel) {
      const oauthConnection = database.connection(authConfig.oauth.connection);
      const oauth = new OAuthManager(
        authConfig.oauth.providers,
        oauthConnection,
        authConfig.oauth.accountsTable ?? 'oauth_accounts',
        defaultUserModel,
      );
      this.app.instance('oauth', oauth);
      this.app.singleton(OAuthManager, () => oauth);
    }

    this.app.use(createStartSessionMiddleware(auth));
    this.app.use(
      createVerifyCsrfTokenMiddleware({
        except: ['/api/*', '/broadcasting/auth'],
      }),
    );
    this.app.middleware('csrf', createVerifyCsrfTokenMiddleware());
    this.app.middleware('auth', createAuthMiddleware(auth));
    this.app.middleware('auth:api', createAuthMiddleware(auth, 'api'));
    this.app.middleware('guest', createGuestMiddleware(auth));
  }

  private resolveRedisManager(): RedisManager | undefined {
    try {
      return this.app.make<RedisManager>('redis');
    } catch {
      return undefined;
    }
  }

  private resolveSessionCipher(): PayloadCipher | undefined {
    const config = this.app.make<ConfigRepository>('config');
    let cryptoConfig: CryptoConfig | undefined;
    try {
      cryptoConfig = config.get<CryptoConfig>('crypto');
    } catch {
      return undefined;
    }

    if (!cryptoConfig?.session?.encrypt) {
      return undefined;
    }

    const key = resolveSessionCipherKey(
      cryptoConfig.session.key,
      cryptoConfig.session.fallbackKey,
    );
    if (!key) {
      throw new Error(
        'Session encryption is enabled but no SESSION_ENCRYPTION_KEY or fallback key is configured.',
      );
    }

    return new PayloadCipher(key);
  }
}