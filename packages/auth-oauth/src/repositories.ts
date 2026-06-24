import { createHash, randomBytes } from 'node:crypto';
import { createSignedTokenServiceFromConfig, type SignedTokenService } from '@tyravel/crypto';
import type { DatabaseConnection } from '@tyravel/database';
import { QueryBuilder } from '@tyravel/database';
import {
  generatePlainToken,
  hashToken,
  parseJsonArray,
  secretsMatch,
} from './token-utils.js';
import type { OAuthTokenSigningConfig } from './types.js';
import type {
  CreateOAuthClientInput,
  CreatedOAuthClient,
  OAuthClientRecord,
  OAuthGrantType,
  OAuthServerConfig,
  ResolvedOAuthAccessToken,
} from './types.js';

interface AuthCodeRow {
  id: number;
  client_id: string;
  user_id: number;
  scopes: string;
  code: string;
  code_challenge: string | null;
  code_challenge_method: string | null;
  redirect_uri: string;
  expires_at: number;
  revoked_at: number | null;
  [key: string]: unknown;
}

interface AccessTokenRow {
  id: number;
  client_id: string;
  user_id: number | null;
  scopes: string;
  token: string;
  expires_at: number;
  revoked_at: number | null;
  [key: string]: unknown;
}

interface RefreshTokenRow {
  id: number;
  access_token_id: number;
  token: string;
  expires_at: number;
  revoked_at: number | null;
  [key: string]: unknown;
}

export class OAuthClientRepository {
  constructor(
    private readonly connection: DatabaseConnection,
    private readonly table: string,
  ) {}

  async create(input: CreateOAuthClientInput): Promise<CreatedOAuthClient> {
    const clientId = randomBytes(16).toString('hex');
    const plainSecret = input.confidential === false ? null : randomBytes(24).toString('hex');
    const now = Math.floor(Date.now() / 1000);
    const grants = input.grants ?? ['authorization_code', 'refresh_token'];
    const scopes = input.scopes ?? ['*'];

    const inserted = await new QueryBuilder(this.connection, this.table).insert({
      client_id: clientId,
      name: input.name,
      secret: plainSecret ? hashToken(plainSecret) : null,
      redirect_uris: JSON.stringify(input.redirectUris),
      grants: JSON.stringify(grants),
      scopes: JSON.stringify(scopes),
      revoked: 0,
      created_at: now,
    });

    return {
      id: Number(inserted),
      clientId,
      clientSecret: plainSecret,
      name: input.name,
      redirectUris: input.redirectUris,
      grants,
      scopes,
    };
  }

  async findByClientId(clientId: string): Promise<OAuthClientRecord | null> {
    return new QueryBuilder<OAuthClientRecord>(this.connection, this.table)
      .where('client_id', clientId)
      .first();
  }

  async validateClient(clientId: string, clientSecret?: string): Promise<OAuthClientRecord | null> {
    const client = await this.findByClientId(clientId);
    if (!client || client.revoked) {
      return null;
    }

    if (client.secret) {
      if (!clientSecret || !secretsMatch(client.secret, hashToken(clientSecret))) {
        return null;
      }
    }

    return client;
  }

  clientGrants(client: OAuthClientRecord): OAuthGrantType[] {
    return parseJsonArray(client.grants, []) as OAuthGrantType[];
  }

  clientScopes(client: OAuthClientRecord): string[] {
    return parseJsonArray(client.scopes, ['*']);
  }

  clientRedirectUris(client: OAuthClientRecord): string[] {
    return parseJsonArray(client.redirect_uris, []);
  }
}

export class OAuthAuthorizationCodeRepository {
  constructor(
    private readonly connection: DatabaseConnection,
    private readonly table: string,
    private readonly ttlMinutes: number,
  ) {}

  async create(input: {
    clientId: string;
    userId: number;
    scopes: string[];
    redirectUri: string;
    codeChallenge?: string;
    codeChallengeMethod?: 'S256';
  }): Promise<{ code: string; expiresAt: number }> {
    const plainCode = randomBytes(32).toString('hex');
    const expiresAt = Math.floor(Date.now() / 1000) + this.ttlMinutes * 60;

    await new QueryBuilder(this.connection, this.table).insert({
      client_id: input.clientId,
      user_id: input.userId,
      scopes: JSON.stringify(input.scopes),
      code: hashToken(plainCode),
      code_challenge: input.codeChallenge ?? null,
      code_challenge_method: input.codeChallengeMethod ?? null,
      redirect_uri: input.redirectUri,
      expires_at: expiresAt,
      revoked_at: null,
      created_at: Math.floor(Date.now() / 1000),
    });

    return { code: plainCode, expiresAt };
  }

  async consume(input: {
    code: string;
    clientId: string;
    redirectUri: string;
    codeVerifier?: string;
  }): Promise<{ userId: number; scopes: string[] } | null> {
    const hashed = hashToken(input.code);
    const row = await new QueryBuilder<AuthCodeRow>(this.connection, this.table)
      .where('code', hashed)
      .where('client_id', input.clientId)
      .first();

    if (!row || row.revoked_at !== null || row.expires_at < Math.floor(Date.now() / 1000)) {
      return null;
    }

    if (row.redirect_uri !== input.redirectUri) {
      return null;
    }

    if (row.code_challenge) {
      if (!input.codeVerifier) {
        return null;
      }

      const method = row.code_challenge_method ?? 'S256';
      if (method !== 'S256') {
        return null;
      }

      const challenge = createHash('sha256').update(input.codeVerifier).digest('base64url');
      if (challenge !== row.code_challenge) {
        return null;
      }
    }

    await new QueryBuilder(this.connection, this.table)
      .where('id', row.id)
      .update({ revoked_at: Math.floor(Date.now() / 1000) });

    return {
      userId: row.user_id,
      scopes: parseJsonArray(row.scopes, ['*']),
    };
  }
}

export class OAuthAccessTokenRepository {
  private readonly signer: SignedTokenService | null;

  constructor(
    private readonly connection: DatabaseConnection,
    private readonly table: string,
    private readonly prefix: string,
    private readonly ttlMinutes: number,
    tokenSigning?: OAuthTokenSigningConfig,
  ) {
    this.signer =
      tokenSigning?.enabled === true
        ? createSignedTokenServiceFromConfig({
            algorithm: tokenSigning.algorithm,
            publicKey: tokenSigning.publicKey,
            secretKey: tokenSigning.secretKey,
            preferNative: tokenSigning.preferNative,
          })
        : null;

    if (tokenSigning?.enabled && !this.signer) {
      throw new Error(
        'OAuth token signing is enabled but OAUTH_TOKEN_PUBLIC_KEY and OAUTH_TOKEN_SECRET_KEY are missing.',
      );
    }
  }

  async issue(input: {
    clientId: string;
    userId?: number | null;
    scopes: string[];
  }): Promise<{ plainToken: string; expiresIn: number; id: number }> {
    const expiresAt = Math.floor(Date.now() / 1000) + this.ttlMinutes * 60;
    const now = Math.floor(Date.now() / 1000);

    if (this.signer) {
      const placeholder = randomBytes(16).toString('hex');
      const inserted = await new QueryBuilder(this.connection, this.table).insert({
        client_id: input.clientId,
        user_id: input.userId ?? null,
        scopes: JSON.stringify(input.scopes),
        token: hashToken(placeholder),
        expires_at: expiresAt,
        revoked_at: null,
        created_at: now,
      });
      const id = Number(inserted);
      const plainToken = this.signer.sign(
        {
          v: 1,
          id,
          exp: expiresAt,
          c: input.clientId,
          u: input.userId ?? null,
          s: input.scopes,
        },
        this.prefix,
      );
      const secret = plainToken.startsWith(this.prefix)
        ? plainToken.slice(this.prefix.length)
        : plainToken;

      await new QueryBuilder(this.connection, this.table)
        .where('id', id)
        .update({ token: hashToken(secret) });

      return {
        plainToken,
        expiresIn: this.ttlMinutes * 60,
        id,
      };
    }

    const plainToken = generatePlainToken(this.prefix);
    const secret = plainToken.slice(this.prefix.length);
    const inserted = await new QueryBuilder(this.connection, this.table).insert({
      client_id: input.clientId,
      user_id: input.userId ?? null,
      scopes: JSON.stringify(input.scopes),
      token: hashToken(secret),
      expires_at: expiresAt,
      revoked_at: null,
      created_at: now,
    });

    return {
      plainToken,
      expiresIn: this.ttlMinutes * 60,
      id: Number(inserted),
    };
  }

  async resolveBearer(bearer: string): Promise<ResolvedOAuthAccessToken | null> {
    if (this.signer?.isSignedToken(bearer, this.prefix)) {
      const payload = this.signer.verify(bearer, this.prefix);
      if (!payload) {
        return null;
      }

      const row = await new QueryBuilder<AccessTokenRow>(this.connection, this.table)
        .where('id', payload.id)
        .first();

      if (!row || row.revoked_at !== null || row.expires_at < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return {
        id: row.id,
        clientId: row.client_id,
        userId: row.user_id,
        scopes: parseJsonArray(row.scopes, ['*']),
      };
    }

    const secret = bearer.startsWith(this.prefix) ? bearer.slice(this.prefix.length) : bearer;
    const row = await new QueryBuilder<AccessTokenRow>(this.connection, this.table)
      .where('token', hashToken(secret))
      .first();

    if (!row || row.revoked_at !== null || row.expires_at < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      id: row.id,
      clientId: row.client_id,
      userId: row.user_id,
      scopes: parseJsonArray(row.scopes, ['*']),
    };
  }

  async revokeByToken(bearer: string): Promise<boolean> {
    if (this.signer?.isSignedToken(bearer, this.prefix)) {
      const payload = this.signer.verify(bearer, this.prefix);
      if (!payload) {
        return false;
      }

      const row = await new QueryBuilder<AccessTokenRow>(this.connection, this.table)
        .where('id', payload.id)
        .first();

      if (!row || row.revoked_at !== null) {
        return false;
      }

      await new QueryBuilder(this.connection, this.table)
        .where('id', row.id)
        .update({ revoked_at: Math.floor(Date.now() / 1000) });

      return true;
    }

    const secret = bearer.startsWith(this.prefix) ? bearer.slice(this.prefix.length) : bearer;
    const row = await new QueryBuilder<AccessTokenRow>(this.connection, this.table)
      .where('token', hashToken(secret))
      .first();

    if (!row || row.revoked_at !== null) {
      return false;
    }

    await new QueryBuilder(this.connection, this.table)
      .where('id', row.id)
      .update({ revoked_at: Math.floor(Date.now() / 1000) });

    return true;
  }

  async findById(id: number): Promise<AccessTokenRow | null> {
    return new QueryBuilder<AccessTokenRow>(this.connection, this.table).where('id', id).first();
  }

  async revokeById(id: number): Promise<void> {
    await new QueryBuilder(this.connection, this.table)
      .where('id', id)
      .update({ revoked_at: Math.floor(Date.now() / 1000) });
  }
}

export class OAuthRefreshTokenRepository {
  constructor(
    private readonly connection: DatabaseConnection,
    private readonly table: string,
    private readonly ttlDays: number,
  ) {}

  async issue(accessTokenId: number): Promise<{ plainToken: string; expiresIn: number }> {
    const plainToken = randomBytes(32).toString('hex');
    const expiresAt = Math.floor(Date.now() / 1000) + this.ttlDays * 24 * 60 * 60;

    await new QueryBuilder(this.connection, this.table).insert({
      access_token_id: accessTokenId,
      token: hashToken(plainToken),
      expires_at: expiresAt,
      revoked_at: null,
      created_at: Math.floor(Date.now() / 1000),
    });

    return {
      plainToken,
      expiresIn: this.ttlDays * 24 * 60 * 60,
    };
  }

  async consume(plainToken: string): Promise<{ accessTokenId: number } | null> {
    const row = await new QueryBuilder<RefreshTokenRow>(this.connection, this.table)
      .where('token', hashToken(plainToken))
      .first();

    if (!row || row.revoked_at !== null || row.expires_at < Math.floor(Date.now() / 1000)) {
      return null;
    }

    await new QueryBuilder(this.connection, this.table)
      .where('id', row.id)
      .update({ revoked_at: Math.floor(Date.now() / 1000) });

    return { accessTokenId: row.access_token_id };
  }

  async revokeByAccessTokenId(accessTokenId: number): Promise<void> {
    await new QueryBuilder(this.connection, this.table)
      .where('access_token_id', accessTokenId)
      .whereNull('revoked_at')
      .update({ revoked_at: Math.floor(Date.now() / 1000) });
  }
}

export function createOAuthRepositories(
  connection: DatabaseConnection,
  config: OAuthServerConfig,
) {
  return {
    clients: new OAuthClientRepository(connection, config.clientsTable ?? 'oauth_clients'),
    codes: new OAuthAuthorizationCodeRepository(
      connection,
      config.codesTable ?? 'oauth_auth_codes',
      config.authorizationCodeTtlMinutes ?? 10,
    ),
    accessTokens: new OAuthAccessTokenRepository(
      connection,
      config.accessTokensTable ?? 'oauth_access_tokens',
      config.tokenPrefix ?? 'oat_',
      config.accessTokenTtlMinutes ?? 60,
      config.tokenSigning,
    ),
    refreshTokens: new OAuthRefreshTokenRepository(
      connection,
      config.refreshTokensTable ?? 'oauth_refresh_tokens',
      config.refreshTokenTtlDays ?? 30,
    ),
  };
}