import { createHash, randomBytes } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { QueryBuilder, SqliteConnection } from '@pondoknusa/database';
import { PersonalAccessTokenRepository } from './personal-access-token-repository.js';
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

async function createRepository(): Promise<{
  repository: PersonalAccessTokenRepository;
  connection: SqliteConnection;
}> {
  const connection = await SqliteConnection.connect(':memory:');
  await connection.exec(`
    CREATE TABLE personal_access_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tokenable_type TEXT NOT NULL,
      tokenable_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      token TEXT NOT NULL,
      token_prefix TEXT,
      abilities TEXT,
      last_used_at INTEGER,
      last_used_ip TEXT,
      expires_at INTEGER,
      revoked_at INTEGER,
      ip_whitelist TEXT,
      created_at INTEGER
    )
  `);

  return {
    connection,
    repository: new PersonalAccessTokenRepository(connection, 'personal_access_tokens'),
  };
}

describe('PersonalAccessTokenRepository', () => {
  let connection: SqliteConnection | undefined;

  afterEach(async () => {
    await connection?.close();
    connection = undefined;
  });

  it('creates prefixed tokens and resolves them', async () => {
    const setup = await createRepository();
    connection = setup.connection;
    const user = new StubUser(1);

    const created = await setup.repository.createToken(user, 'mobile', ['posts:read'], {
      expiresIn: '1h',
    });

    expect(created.plainTextToken.startsWith('tyr_')).toBe(true);
    expect(created.tokenPrefix.startsWith('tyr_')).toBe(true);
    expect(created.id).toBeGreaterThan(0);

    const resolved = await setup.repository.findUserIdByBearerToken(
      created.plainTextToken,
      async (id) => (id === 1 ? user : null),
      { ip: '127.0.0.1' },
    );

    expect(resolved?.abilities).toEqual(['posts:read']);
    expect(resolved?.id).toBe(created.id);
  });

  it('rejects revoked tokens', async () => {
    const setup = await createRepository();
    connection = setup.connection;
    const user = new StubUser(1);
    const created = await setup.repository.createToken(user, 'mobile');

    expect(await setup.repository.revokeToken(created.id, 1)).toBe(true);

    const resolved = await setup.repository.findUserIdByBearerToken(
      created.plainTextToken,
      async () => user,
    );
    expect(resolved).toBeNull();
  });

  it('enforces ip whitelist', async () => {
    const setup = await createRepository();
    connection = setup.connection;
    const user = new StubUser(1);
    const created = await setup.repository.createToken(user, 'ops', ['*'], {
      ipWhitelist: ['10.0.0.1'],
    });

    const allowed = await setup.repository.findUserIdByBearerToken(
      created.plainTextToken,
      async () => user,
      { ip: '10.0.0.1' },
    );
    const denied = await setup.repository.findUserIdByBearerToken(
      created.plainTextToken,
      async () => user,
      { ip: '127.0.0.1' },
    );

    expect(allowed).not.toBeNull();
    expect(denied).toBeNull();
  });

  it('still resolves legacy unprefixed tokens', async () => {
    const setup = await createRepository();
    connection = setup.connection;
    const user = new StubUser(1);
    const legacySecret = randomBytes(32).toString('hex');

    await new QueryBuilder(setup.connection, 'personal_access_tokens').insert({
      tokenable_type: 'users',
      tokenable_id: 1,
      name: 'legacy',
      token: createHash('sha256').update(legacySecret).digest('hex'),
      abilities: '["*"]',
      created_at: 1,
    });

    const resolved = await setup.repository.findUserIdByBearerToken(
      legacySecret,
      async () => user,
    );
    expect(resolved).not.toBeNull();
  });
});