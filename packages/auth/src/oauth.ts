import { randomBytes } from 'node:crypto';
import type { DatabaseConnection } from '@tyravel/database';
import { QueryBuilder } from '@tyravel/database';
import { Hasher } from './hasher.js';
import { BUILTIN_SOCIAL_OAUTH_DRIVERS } from './social/builtin-drivers.js';
import { createPkcePair } from './social/pkce.js';
import type {
  OAuthAuthorizeContext,
  OAuthExchangeContext,
  SocialOAuthDriver,
  SocialOAuthDriverConstructor,
} from './social/types.js';
import type { OAuthProviderConfig } from './types.js';
import type { Authenticatable, UserModelConstructor } from './types.js';
import type { OAuthUserProfile } from './oauth-types.js';

export type { OAuthUserProfile } from './oauth-types.js';
export type { OAuthAuthorizeContext, OAuthExchangeContext } from './social/types.js';
export type { PkcePair } from './social/pkce.js';
export { createPkcePair } from './social/pkce.js';

export type OAuthDriver = SocialOAuthDriver;
export type OAuthDriverConstructor = SocialOAuthDriverConstructor;

export {
  AppleOAuthDriver,
  BitbucketOAuthDriver,
  DiscordOAuthDriver,
  FacebookOAuthDriver,
  GithubOAuthDriver,
  GitlabOAuthDriver,
  GoogleOAuthDriver,
  LinkedInOAuthDriver,
  MicrosoftOAuthDriver,
  SlackOAuthDriver,
  SpotifyOAuthDriver,
  TwitchOAuthDriver,
  XOAuthDriver,
} from './social/builtin-drivers.js';

const customOAuthDrivers = new Map<string, SocialOAuthDriverConstructor>();

export function registerOAuthDriver(name: string, ctor: SocialOAuthDriverConstructor): void {
  customOAuthDrivers.set(name, ctor);
}

export function clearOAuthDriversForTesting(): void {
  customOAuthDrivers.clear();
}

function resolveOAuthDriver(name: string, config: OAuthProviderConfig): SocialOAuthDriverConstructor | undefined {
  const driverName = config.driver ?? name;
  return customOAuthDrivers.get(driverName) ?? BUILTIN_SOCIAL_OAUTH_DRIVERS[driverName];
}

interface OAuthAccountRow {
  id: number;
  user_id: number;
  provider: string;
  provider_user_id: string;
  [key: string]: unknown;
}

export class OAuthManager {
  private readonly drivers = new Map<string, SocialOAuthDriver>();
  private readonly hasher = new Hasher();

  constructor(
    providers: Record<string, OAuthProviderConfig>,
    private readonly connection: DatabaseConnection,
    private readonly accountsTable: string,
    private readonly userModel: UserModelConstructor,
  ) {
    for (const [name, config] of Object.entries(providers)) {
      const Driver = resolveOAuthDriver(name, config);
      if (!Driver) {
        throw new Error(`Unsupported OAuth provider: ${name}`);
      }
      this.drivers.set(name, new Driver(config));
    }
  }

  createState(): string {
    return randomBytes(24).toString('base64url');
  }

  createPkcePair() {
    return createPkcePair();
  }

  redirectUrl(
    provider: string,
    state: string,
    authorize: OAuthAuthorizeContext = {},
  ): string {
    const driver = this.drivers.get(provider);
    if (!driver) {
      throw new Error(`OAuth provider not configured: ${provider}`);
    }

    return driver.authorizationUrl(state, authorize);
  }

  async handleCallback(
    provider: string,
    code: string,
    exchange: OAuthExchangeContext = {},
  ): Promise<OAuthUserProfile> {
    const driver = this.drivers.get(provider);
    if (!driver) {
      throw new Error(`OAuth provider not configured: ${provider}`);
    }

    return driver.exchangeCode(code, exchange);
  }

  driverUsesPkce(provider: string): boolean {
    const driver = this.drivers.get(provider);
    return driver?.usesPkce === true;
  }

  async findOrCreateUser(
    provider: string,
    profile: OAuthUserProfile,
  ): Promise<Authenticatable> {
    const existing = await new QueryBuilder<OAuthAccountRow>(this.connection, this.accountsTable)
      .where('provider', provider)
      .where('provider_user_id', profile.id)
      .first();

    if (existing) {
      const user = await (this.userModel as unknown as typeof import('@tyravel/database').Model).find(
        existing.user_id,
      );
      if (user) {
        return user as unknown as Authenticatable;
      }
    }

    const ModelClass = this.userModel as unknown as typeof import('@tyravel/database').Model;
    let user: Authenticatable | null = null;

    if (profile.email) {
      user = (await ModelClass.query()
        .where('email', profile.email)
        .firstModel()) as Authenticatable | null;
    }

    if (!user) {
      const now = Math.floor(Date.now() / 1000);
      const placeholder = randomBytes(32).toString('hex');
      const inserted = await ModelClass.query().insert({
        name: profile.name ?? 'User',
        email: profile.email ?? `${provider}-${profile.id}@oauth.local`,
        password: this.hasher.make(placeholder),
        created_at: now,
        updated_at: now,
      });

      user = (await ModelClass.find(inserted)) as unknown as Authenticatable;
    }

    const linked = await new QueryBuilder<OAuthAccountRow>(this.connection, this.accountsTable)
      .where('provider', provider)
      .where('provider_user_id', profile.id)
      .first();

    if (!linked) {
      await new QueryBuilder(this.connection, this.accountsTable).insert({
        user_id: Number(user.getAuthIdentifier()),
        provider,
        provider_user_id: profile.id,
        email: profile.email,
        avatar: profile.avatar,
        created_at: Math.floor(Date.now() / 1000),
      });
    }

    return user;
  }
}