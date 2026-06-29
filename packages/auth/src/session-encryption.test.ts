import { describe, expect, it } from 'vitest';
import { PayloadCipher, deriveAtRestKey } from '@pondoknusa/crypto';
import { SqliteConnection } from '@pondoknusa/database';
import { MemorySessionStore, DatabaseSessionStore } from './session-store.js';

describe('session encryption', () => {
  it('stores encrypted payloads in sqlite sessions', async () => {
    const connection = await SqliteConnection.connect(':memory:');
    await connection.exec(`
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        last_activity INTEGER NOT NULL,
        user_id INTEGER,
        ip_address TEXT,
        user_agent TEXT
      )
    `);

    const cipher = new PayloadCipher(deriveAtRestKey('test-session-key'));
    const store = new DatabaseSessionStore(connection, 'sessions', cipher);
    await store.write('sess-1', { 'auth.web': 1, theme: 'dark' }, 120);

    const result = await connection.query('SELECT payload FROM sessions WHERE id = ?', ['sess-1']);
    expect(String(result.rows[0]?.payload).startsWith('pqc1:')).toBe(true);
    expect(await store.read('sess-1')).toEqual({ 'auth.web': 1, theme: 'dark' });
    await connection.close();
  });

  it('leaves memory sessions unencrypted', async () => {
    const store = new MemorySessionStore();
    await store.write('sess-1', { count: 2 }, 30);
    expect(await store.read('sess-1')).toEqual({ count: 2 });
  });
});