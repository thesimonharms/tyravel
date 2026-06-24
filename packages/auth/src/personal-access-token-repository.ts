import { createHash, randomBytes } from 'node:crypto';
import type { DatabaseConnection } from '@tyravel/database';
import { QueryBuilder } from '@tyravel/database';
import { parseTokenAbilities } from './token-abilities.js';
import { parseExpiresIn } from './token-expiry.js';
import type { Authenticatable } from './types.js';
import type { CreateTokenOptions, NewAccessToken } from './types.js';

export interface ResolvedAccessToken {
  id: number;
  user: Authenticatable;
  abilities: string[];
}

export interface TokenLookupContext {
  ip?: string;
}

interface TokenRow {
  id: number;
  tokenable_type: string;
  tokenable_id: number;
  name: string;
  token: string;
  token_prefix: string | null;
  abilities: string;
  last_used_at: number | null;
  last_used_ip: string | null;
  expires_at: number | null;
  revoked_at: number | null;
  ip_whitelist: string | null;
  [key: string]: unknown;
}

export class PersonalAccessTokenRepository {
  private readonly prefix: string;
  private readonly prefixDisplayLength: number;

  constructor(
    private readonly connection: DatabaseConnection,
    private readonly table: string,
    private readonly tokenableType = 'users',
    options: { prefix?: string; prefixLength?: number } = {},
  ) {
    this.prefix = options.prefix ?? 'tyr_';
    this.prefixDisplayLength = options.prefixLength ?? 8;
  }

  async createToken(
    user: Authenticatable,
    name: string,
    abilities: string[] = ['*'],
    options: CreateTokenOptions = {},
  ): Promise<NewAccessToken> {
    const secret = randomBytes(32).toString('hex');
    const plainTextToken = `${this.prefix}${secret}`;
    const hashed = this.hashToken(secret);
    const tokenPrefix = `${this.prefix}${secret.slice(0, this.prefixDisplayLength)}`;
    const expiresAt = parseExpiresIn(options.expiresIn);
    const now = Math.floor(Date.now() / 1000);

    const inserted = await new QueryBuilder(this.connection, this.table).insert({
      tokenable_type: this.tokenableType,
      tokenable_id: Number(user.getAuthIdentifier()),
      name,
      token: hashed,
      token_prefix: tokenPrefix,
      abilities: JSON.stringify(abilities),
      last_used_at: null,
      last_used_ip: null,
      expires_at: expiresAt ? Math.floor(expiresAt.getTime() / 1000) : null,
      revoked_at: null,
      ip_whitelist: options.ipWhitelist ? JSON.stringify(options.ipWhitelist) : null,
      created_at: now,
    });

    return {
      id: Number(inserted),
      plainTextToken,
      tokenPrefix,
      name,
      abilities,
      expiresAt: expiresAt ?? null,
    };
  }

  async findUserIdByBearerToken(
    bearer: string,
    lookupUser: (id: number) => Promise<Authenticatable | null>,
    context: TokenLookupContext = {},
  ): Promise<ResolvedAccessToken | null> {
    const secret = this.normalizeBearerSecret(bearer);
    const hashed = this.hashToken(secret);
    const row = await new QueryBuilder<TokenRow>(this.connection, this.table)
      .where('token', hashed)
      .first();

    if (!row || row.revoked_at !== null) {
      return null;
    }

    if (row.expires_at !== null && row.expires_at < Math.floor(Date.now() / 1000)) {
      return null;
    }

    if (!this.ipAllowed(row.ip_whitelist, context.ip)) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    await new QueryBuilder(this.connection, this.table)
      .where('id', row.id)
      .update({
        last_used_at: now,
        last_used_ip: context.ip ?? row.last_used_ip,
      });

    const user = await lookupUser(row.tokenable_id);
    if (!user) {
      return null;
    }

    return {
      id: row.id,
      user,
      abilities: parseTokenAbilities(row.abilities),
    };
  }

  async revokeToken(tokenId: number, userId: number): Promise<boolean> {
    const row = await new QueryBuilder<TokenRow>(this.connection, this.table)
      .where('id', tokenId)
      .where('tokenable_type', this.tokenableType)
      .where('tokenable_id', userId)
      .first();

    if (!row || row.revoked_at !== null) {
      return false;
    }

    await new QueryBuilder(this.connection, this.table)
      .where('id', tokenId)
      .update({ revoked_at: Math.floor(Date.now() / 1000) });

    return true;
  }

  async revokeTokensForUser(userId: number): Promise<number> {
    const now = Math.floor(Date.now() / 1000);
    const rows = await new QueryBuilder<TokenRow>(this.connection, this.table)
      .where('tokenable_type', this.tokenableType)
      .where('tokenable_id', userId)
      .whereNull('revoked_at')
      .get();

    if (rows.length === 0) {
      return 0;
    }

    await new QueryBuilder(this.connection, this.table)
      .where('tokenable_type', this.tokenableType)
      .where('tokenable_id', userId)
      .whereNull('revoked_at')
      .update({ revoked_at: now });

    return rows.length;
  }

  private normalizeBearerSecret(bearer: string): string {
    if (bearer.startsWith(this.prefix)) {
      return bearer.slice(this.prefix.length);
    }

    return bearer;
  }

  private ipAllowed(rawWhitelist: string | null, ip?: string): boolean {
    if (!rawWhitelist) {
      return true;
    }

    let whitelist: string[];
    try {
      const parsed = JSON.parse(rawWhitelist) as unknown;
      if (!Array.isArray(parsed)) {
        return true;
      }
      whitelist = parsed.filter((entry): entry is string => typeof entry === 'string');
    } catch {
      return true;
    }

    if (whitelist.length === 0) {
      return true;
    }

    if (!ip) {
      return false;
    }

    return whitelist.includes(ip);
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}