import { createHash, randomBytes } from 'node:crypto';
import type { DatabaseConnection } from '@tyravel/database';
import { QueryBuilder } from '@tyravel/database';
import type { Authenticatable } from './types.js';
import type { NewAccessToken } from './types.js';

interface TokenRow {
  id: number;
  tokenable_type: string;
  tokenable_id: number;
  name: string;
  token: string;
  abilities: string;
  last_used_at: number | null;
  expires_at: number | null;
  [key: string]: unknown;
}

export class PersonalAccessTokenRepository {
  constructor(
    private readonly connection: DatabaseConnection,
    private readonly table: string,
    private readonly tokenableType = 'users',
  ) {}

  async createToken(
    user: Authenticatable,
    name: string,
    abilities: string[] = ['*'],
    expiresAt?: Date,
  ): Promise<NewAccessToken> {
    const plainTextToken = randomBytes(32).toString('hex');
    const hashed = this.hashToken(plainTextToken);
    const now = Math.floor(Date.now() / 1000);

    await new QueryBuilder(this.connection, this.table).insert({
      tokenable_type: this.tokenableType,
      tokenable_id: Number(user.getAuthIdentifier()),
      name,
      token: hashed,
      abilities: JSON.stringify(abilities),
      last_used_at: null,
      expires_at: expiresAt ? Math.floor(expiresAt.getTime() / 1000) : null,
      created_at: now,
    });

    return { plainTextToken, name, abilities };
  }

  async findUserIdByBearerToken(
    bearer: string,
    lookupUser: (id: number) => Promise<Authenticatable | null>,
  ): Promise<Authenticatable | null> {
    const hashed = this.hashToken(bearer);
    const row = await new QueryBuilder<TokenRow>(this.connection, this.table)
      .where('token', hashed)
      .first();

    if (!row) {
      return null;
    }

    if (row.expires_at !== null && row.expires_at < Math.floor(Date.now() / 1000)) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    await new QueryBuilder(this.connection, this.table)
      .where('id', row.id)
      .update({ last_used_at: now });

    return lookupUser(row.tokenable_id);
  }

  async revokeTokensForUser(userId: number): Promise<void> {
    await new QueryBuilder(this.connection, this.table)
      .where('tokenable_type', this.tokenableType)
      .where('tokenable_id', userId)
      .delete();
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}