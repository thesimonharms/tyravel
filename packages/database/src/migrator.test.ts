import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { Migrator } from './migrator.js';
import { SqliteConnection } from './sqlite-connection.js';
import { SchemaBuilder } from './schema/schema-builder.js';

describe('Migrator', () => {
  let tempDir = '';

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = '';
    }
  });

  it('runs pending migration files', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'pondoknusa-migrations-'));
    writeFileSync(
      join(tempDir, '2026_06_20_000000_create_users_table.js'),
      `export default class CreateUsersTable {
        async up(_connection, schema) {
          await schema.create('users', (table) => {
            table.id();
            table.string('email');
          });
        }
        async down(_connection, schema) {
          await schema.drop('users');
        }
      }`,
    );

    const connection = new SqliteConnection(':memory:');
    const migrator = new Migrator(connection, tempDir);
    const ran = await migrator.run();

    expect(ran).toEqual(['2026_06_20_000000_create_users_table.js']);

    const schema = new SchemaBuilder(connection);
    expect(await schema.hasTable('users')).toBe(true);
  });
});