import { ConfigRepository } from '@tyravel/config';
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
  DatabaseSessionStore,
  EloquentUserProvider,
  type AuthConfig,
  type EloquentUserProviderConfig,
  type GuardConfig,
} from '@tyravel/auth';
import { ServiceProvider } from './service-provider.js';

export class AuthServiceProvider extends ServiceProvider {
  override register() {
    const config = this.app.make<ConfigRepository>('config');
    const authConfig = config.get<AuthConfig>('auth');
    const database = this.app.make<DatabaseManager>('db');

    const sessionConnection = database.connection(authConfig.session.connection);
    const sessionStore = new DatabaseSessionStore(
      sessionConnection,
      authConfig.session.table,
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
            sessionStore,
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
  }

  override boot() {
    const auth = this.app.make<AuthManager>('auth');

    this.app.use(createStartSessionMiddleware(auth));
    this.app.middleware('auth', createAuthMiddleware(auth));
    this.app.middleware('auth:api', createAuthMiddleware(auth, 'api'));
    this.app.middleware('guest', createGuestMiddleware(auth));
  }
}