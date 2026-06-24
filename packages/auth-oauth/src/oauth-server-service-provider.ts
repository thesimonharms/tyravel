import { ConfigRepository } from '@tyravel/config';
import type { CryptoConfig } from '@tyravel/crypto';
import { DatabaseManager } from '@tyravel/database';
import { EloquentUserProvider, type AuthConfig } from '@tyravel/auth';
import { ServiceProvider } from '@tyravel/core';
import { createOAuth2AuthMiddleware } from './middleware.js';
import { OAuthServer } from './oauth-server.js';
import type { OAuthServerConfig } from './types.js';

export class OAuthServerServiceProvider extends ServiceProvider {
  override async register(): Promise<void> {
    const config = this.app.make<ConfigRepository>('config');
    let oauthServerConfig =
      config.get<OAuthServerConfig>('oauthServer') ??
      config.get<OAuthServerConfig>('oauth-server');
    if (!oauthServerConfig) {
      return;
    }

    oauthServerConfig = this.mergeCryptoSigningConfig(oauthServerConfig, config);

    const database = this.app.make<DatabaseManager>('db');
    const connection = database.connection(oauthServerConfig.connection);
    const authConfig = config.get<AuthConfig>('auth');
    const userProviderConfig =
      authConfig.providers.users ?? Object.values(authConfig.providers)[0];
    const userProvider = userProviderConfig
      ? new EloquentUserProvider(userProviderConfig.model)
      : undefined;

    const server = new OAuthServer(connection, oauthServerConfig, userProvider);
    this.app.instance('oauth.server', server);
    this.app.singleton(OAuthServer, () => server);
  }

  override async boot(): Promise<void> {
    const config = this.app.make<ConfigRepository>('config');
    if (!config.get('oauthServer') && !config.get('oauth-server')) {
      return;
    }

    const server = this.app.make<OAuthServer>('oauth.server');
    this.app.middleware('auth:oauth', createOAuth2AuthMiddleware(server));
  }

  private mergeCryptoSigningConfig(
    oauthServerConfig: OAuthServerConfig,
    config: ConfigRepository,
  ): OAuthServerConfig {
    if (oauthServerConfig.tokenSigning) {
      return oauthServerConfig;
    }

    let cryptoConfig: CryptoConfig | undefined;
    try {
      cryptoConfig = config.get<CryptoConfig>('crypto');
    } catch {
      return oauthServerConfig;
    }

    if (!cryptoConfig?.oauth?.signTokens) {
      return oauthServerConfig;
    }

    return {
      ...oauthServerConfig,
      tokenSigning: {
        enabled: true,
        algorithm: cryptoConfig.oauth.algorithm ?? cryptoConfig.signature ?? 'ml-dsa-65',
        publicKey: cryptoConfig.oauth.publicKey,
        secretKey: cryptoConfig.oauth.secretKey,
        preferNative: cryptoConfig.preferNative,
      },
    };
  }
}