import { randomBytes } from 'node:crypto';
import type { DatabaseConnection } from '@tyravel/database';
import { QueryBuilder } from '@tyravel/database';
import type { OAuthProviderConfig } from './types.js';
import type { Authenticatable, UserModelConstructor } from './types.js';

export interface OAuthUserProfile {
  id: string;
  email: string | null;
  name: string | null;
  avatar: string | null;
}

interface OAuthAccountRow {
  id: number;
  user_id: number;
  provider: string;
  provider_user_id: string;
  [key: string]: unknown;
}

export interface OAuthDriver {
  readonly name: string;
  authorizationUrl(state: string): string;
  exchangeCode(code: string): Promise<OAuthUserProfile>;
}

export class GithubOAuthDriver implements OAuthDriver {
  readonly name = 'github';

  constructor(private readonly config: OAuthProviderConfig) {}

  authorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: (this.config.scopes ?? ['user:email']).join(' '),
      state,
    });
    return `https://github.com/login/oauth/authorize?${params}`;
  }

  async exchangeCode(code: string): Promise<OAuthUserProfile> {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.config.redirectUri,
      }),
    });

    const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenJson.access_token) {
      throw new Error(tokenJson.error ?? 'OAuth token exchange failed');
    }

    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        authorization: `Bearer ${tokenJson.access_token}`,
        accept: 'application/json',
        'user-agent': 'tyravel-auth',
      },
    });

    const user = (await userRes.json()) as {
      id: number;
      login?: string;
      email?: string | null;
      name?: string | null;
      avatar_url?: string | null;
    };

    return {
      id: String(user.id),
      email: user.email ?? null,
      name: user.name ?? user.login ?? null,
      avatar: user.avatar_url ?? null,
    };
  }
}

export class DiscordOAuthDriver implements OAuthDriver {
  readonly name = 'discord';

  constructor(private readonly config: OAuthProviderConfig) {}

  authorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: (this.config.scopes ?? ['identify', 'email']).join(' '),
      state,
    });
    return `https://discord.com/api/oauth2/authorize?${params}`;
  }

  async exchangeCode(code: string): Promise<OAuthUserProfile> {
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirectUri,
      }),
    });

    const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenJson.access_token) {
      throw new Error(tokenJson.error ?? 'OAuth token exchange failed');
    }

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { authorization: `Bearer ${tokenJson.access_token}` },
    });

    const user = (await userRes.json()) as {
      id: string;
      email?: string | null;
      username?: string;
      global_name?: string | null;
      avatar?: string | null;
    };

    const avatar = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
      : null;

    return {
      id: user.id,
      email: user.email ?? null,
      name: user.global_name ?? user.username ?? null,
      avatar,
    };
  }
}

export class MicrosoftOAuthDriver implements OAuthDriver {
  readonly name = 'microsoft';

  constructor(private readonly config: OAuthProviderConfig) {}

  authorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: (this.config.scopes ?? ['openid', 'profile', 'email', 'User.Read']).join(' '),
      state,
    });
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
  }

  async exchangeCode(code: string): Promise<OAuthUserProfile> {
    const tokenRes = await fetch(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.config.redirectUri,
        }),
      },
    );

    const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenJson.access_token) {
      throw new Error(tokenJson.error ?? 'OAuth token exchange failed');
    }

    const userRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { authorization: `Bearer ${tokenJson.access_token}` },
    });

    const user = (await userRes.json()) as {
      id: string;
      mail?: string | null;
      userPrincipalName?: string;
      displayName?: string | null;
    };

    return {
      id: user.id,
      email: user.mail ?? user.userPrincipalName ?? null,
      name: user.displayName ?? null,
      avatar: null,
    };
  }
}

export class GoogleOAuthDriver implements OAuthDriver {
  readonly name = 'google';

  constructor(private readonly config: OAuthProviderConfig) {}

  authorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: (this.config.scopes ?? ['openid', 'email', 'profile']).join(' '),
      state,
      access_type: 'online',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async exchangeCode(code: string): Promise<OAuthUserProfile> {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUri,
      }),
    });

    const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenJson.access_token) {
      throw new Error(tokenJson.error ?? 'OAuth token exchange failed');
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { authorization: `Bearer ${tokenJson.access_token}` },
    });

    const user = (await userRes.json()) as {
      id: string;
      email?: string;
      name?: string;
      picture?: string;
    };

    return {
      id: user.id,
      email: user.email ?? null,
      name: user.name ?? null,
      avatar: user.picture ?? null,
    };
  }
}

const BUILTIN_OAUTH_DRIVERS: Record<
  string,
  new (config: OAuthProviderConfig) => OAuthDriver
> = {
  github: GithubOAuthDriver,
  google: GoogleOAuthDriver,
  discord: DiscordOAuthDriver,
  microsoft: MicrosoftOAuthDriver,
};

export class OAuthManager {
  private readonly drivers = new Map<string, OAuthDriver>();

  constructor(
    providers: Record<string, OAuthProviderConfig>,
    private readonly connection: DatabaseConnection,
    private readonly accountsTable: string,
    private readonly userModel: UserModelConstructor,
  ) {
    for (const [name, config] of Object.entries(providers)) {
      const Driver = BUILTIN_OAUTH_DRIVERS[name];
      if (!Driver) {
        throw new Error(`Unsupported OAuth provider: ${name}`);
      }
      this.drivers.set(name, new Driver(config));
    }
  }

  createState(): string {
    return randomBytes(24).toString('base64url');
  }

  redirectUrl(provider: string, state: string): string {
    const driver = this.drivers.get(provider);
    if (!driver) {
      throw new Error(`OAuth provider not configured: ${provider}`);
    }

    return driver.authorizationUrl(state);
  }

  async handleCallback(provider: string, code: string): Promise<OAuthUserProfile> {
    const driver = this.drivers.get(provider);
    if (!driver) {
      throw new Error(`OAuth provider not configured: ${provider}`);
    }

    return driver.exchangeCode(code);
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
      const inserted = await ModelClass.query().insert({
        name: profile.name ?? 'User',
        email: profile.email ?? `${provider}-${profile.id}@oauth.local`,
        password: randomBytes(32).toString('hex'),
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