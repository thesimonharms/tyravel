import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { PasswordResetBroker } from './password-reset-broker.js';
import type { UserProvider } from './user-provider.js';
import type { Authenticatable } from './types.js';

class StubUser implements Authenticatable {
  constructor(private readonly id: number) {}

  getAuthIdentifier(): number {
    return this.id;
  }

  getAuthPassword(): string {
    return 'hash';
  }
}

class StubProvider implements UserProvider {
  async retrieveById(): Promise<Authenticatable | null> {
    return null;
  }

  async retrieveByCredentials(): Promise<Authenticatable | null> {
    return null;
  }

  async validateCredentials(): Promise<boolean> {
    return false;
  }
}

describe('PasswordResetBroker', () => {
  it('compares reset tokens with timing-safe equality', () => {
    const broker = new PasswordResetBroker(
      {} as never,
      { provider: 'users', table: 'password_reset_tokens', expireMinutes: 60 },
      new StubProvider(),
    );

    const plain = 'reset-token';
    const hashed = createHash('sha256').update(plain).digest('hex');
    const tokenValid = (
      broker as unknown as {
        tokenValid(row: { token: string; created_at: number }, plain: string): boolean;
      }
    ).tokenValid.bind(broker);

    expect(
      tokenValid(
        { token: hashed, created_at: Math.floor(Date.now() / 1000) },
        plain,
      ),
    ).toBe(true);
    expect(
      tokenValid(
        { token: hashed, created_at: Math.floor(Date.now() / 1000) },
        'wrong-token',
      ),
    ).toBe(false);
  });
});