import { createHash, randomBytes } from 'node:crypto';
import type { DatabaseConnection } from '@tyravel/database';
import { QueryBuilder } from '@tyravel/database';
import { Hasher } from './hasher.js';
import { InvalidResetTokenException } from './authorization-exceptions.js';
import type { PasswordBrokerConfig } from './types.js';
import type { UserProvider } from './user-provider.js';

interface ResetRow {
  email: string;
  token: string;
  created_at: number;
  [key: string]: unknown;
}

export class PasswordResetBroker {
  private readonly hasher = new Hasher();

  constructor(
    private readonly connection: DatabaseConnection,
    private readonly config: PasswordBrokerConfig,
    private readonly provider: UserProvider,
  ) {}

  async sendResetLink(email: string): Promise<string> {
    const user = await this.provider.retrieveByCredentials({ email });
    if (!user) {
      return this.issueDummyToken();
    }

    const plainToken = randomBytes(32).toString('hex');
    const hashed = this.hashToken(plainToken);
    const now = Math.floor(Date.now() / 1000);

    await new QueryBuilder(this.connection, this.config.table)
      .where('email', email)
      .delete();

    await new QueryBuilder(this.connection, this.config.table).insert({
      email,
      token: hashed,
      created_at: now,
    });

    return plainToken;
  }

  async reset(input: {
    email: string;
    token: string;
    password: string;
  }): Promise<void> {
    const row = await new QueryBuilder<ResetRow>(this.connection, this.config.table)
      .where('email', input.email)
      .first();

    if (!row || !this.tokenValid(row, input.token)) {
      throw new InvalidResetTokenException();
    }

    const user = await this.provider.retrieveByCredentials({ email: input.email });
    if (!user) {
      throw new InvalidResetTokenException();
    }

    const { Model } = await import('@tyravel/database');
    const ModelClass = user.constructor as unknown as typeof Model;
    const passwordHash = this.hasher.make(input.password);
    await ModelClass.query()
      .where('id', user.getAuthIdentifier())
      .update({ password: passwordHash });

    await new QueryBuilder(this.connection, this.config.table)
      .where('email', input.email)
      .delete();
  }

  private tokenValid(row: ResetRow, plain: string): boolean {
    const ageMinutes = (Math.floor(Date.now() / 1000) - row.created_at) / 60;
    if (ageMinutes > this.config.expireMinutes) {
      return false;
    }

    return this.hashToken(plain) === row.token;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private issueDummyToken(): string {
    return randomBytes(32).toString('hex');
  }
}