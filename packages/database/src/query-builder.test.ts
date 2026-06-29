import { describe, expect, it } from 'vitest';
import { SqliteConnection } from './sqlite-connection.js';
import { QueryBuilder } from './query-builder.js';

describe('QueryBuilder', () => {
  it('inserts, queries, updates, and deletes rows', async () => {
    const connection = new SqliteConnection(':memory:');
    await connection.exec(`
      CREATE TABLE "users" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL
      )
    `);

    const builder = new QueryBuilder(connection, 'users');
    const id = await builder.insert({ name: 'Ada', email: 'ada@example.com' });

    const found = await new QueryBuilder(connection, 'users')
      .where('id', Number(id))
      .first();

    expect(found).toEqual({
      id: Number(id),
      name: 'Ada',
      email: 'ada@example.com',
    });

    await new QueryBuilder(connection, 'users')
      .where('id', Number(id))
      .update({ name: 'Grace' });

    const updated = await new QueryBuilder(connection, 'users')
      .where('email', 'ada@example.com')
      .first();

    expect(updated?.name).toBe('Grace');

    const deleted = await new QueryBuilder(connection, 'users')
      .where('id', Number(id))
      .delete();

    expect(deleted).toBe(1);
  });

  it('whereIn with an empty list matches no rows', async () => {
    const connection = new SqliteConnection(':memory:');
    await connection.exec(`
      CREATE TABLE "users" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL
      )
    `);

    await new QueryBuilder(connection, 'users').insert({ name: 'Ada' });

    const count = await new QueryBuilder(connection, 'users').whereIn('id', []).count();
    expect(count).toBe(0);
  });
});