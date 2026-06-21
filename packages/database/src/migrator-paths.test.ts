import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { Migrator } from './migrator.js';
import { SqliteConnection } from './sqlite-connection.js';
import { SchemaBuilder } from './schema/schema-builder.js';

const migrationSource = (table: string) => `export default class CreateTable {
  async up(_connection, schema) {
    await schema.create('${table}', (table) => {
      table.id();
    });
  }
  async down(_connection, schema) {
    await schema.drop('${table}');
  }
}`;

describe('Migrator paths', () => {
  let tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs = [];
  });

  it('runs migrations from multiple directories in filename order', async () => {
    const appDir = mkdtempSync(join(tmpdir(), 'tyravel-app-migrations-'));
    const packageDir = mkdtempSync(join(tmpdir(), 'tyravel-package-migrations-'));
    tempDirs.push(appDir, packageDir);

    writeFileSync(
      join(appDir, '2026_06_20_000002_create_users_table.js'),
      migrationSource('users'),
    );
    writeFileSync(
      join(packageDir, '2026_06_20_000001_create_posts_table.js'),
      migrationSource('posts'),
    );

    const connection = new SqliteConnection(':memory:');
    const migrator = new Migrator(connection, [appDir, packageDir]);
    const ran = await migrator.run();

    expect(ran).toEqual([
      '2026_06_20_000001_create_posts_table.js',
      '2026_06_20_000002_create_users_table.js',
    ]);

    const schema = new SchemaBuilder(connection);
    expect(await schema.hasTable('posts')).toBe(true);
    expect(await schema.hasTable('users')).toBe(true);
  });
});