import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ConfigRepository } from '@tyravel/config';
import { Migrator } from '@tyravel/database';
import { SqliteConnection } from '@tyravel/database';
import { Application } from './application.js';
import { DatabaseServiceProvider } from './database-service-provider.js';
import { ServiceProvider } from './service-provider.js';

describe('ServiceProvider.loadMigrationsFrom', () => {
  let root = '';
  let packageMigrations = '';

  afterEach(() => {
    if (root) {
      rmSync(root, { recursive: true, force: true });
      root = '';
    }
    if (packageMigrations) {
      rmSync(packageMigrations, { recursive: true, force: true });
      packageMigrations = '';
    }
  });

  it('registers package migrations for tyravel migrate', async () => {
    root = mkdtempSync(join(tmpdir(), 'tyravel-consumer-'));
    packageMigrations = mkdtempSync(join(tmpdir(), 'tyravel-lontar-migrations-'));

    mkdirSync(join(root, 'database/migrations'), { recursive: true });
    writeFileSync(
      join(root, 'database/migrations/2026_06_20_000002_create_users_table.js'),
      `export default class CreateUsersTable {
        async up(_connection, schema) {
          await schema.create('users', (table) => {
            table.id();
          });
        }
        async down(_connection, schema) {
          await schema.drop('users');
        }
      }`,
    );
    writeFileSync(
      join(packageMigrations, '2026_06_20_000001_create_posts_table.js'),
      `export default class CreatePostsTable {
        async up(_connection, schema) {
          await schema.create('posts', (table) => {
            table.id();
          });
        }
        async down(_connection, schema) {
          await schema.drop('posts');
        }
      }`,
    );

    class LontarServiceProvider extends ServiceProvider {
      override register() {
        this.loadMigrationsFrom(packageMigrations);
      }
    }

    const app = new Application(root);
    app.instance(
      'config',
      new ConfigRepository({
        database: {
          default: 'sqlite',
          connections: {
            sqlite: { driver: 'sqlite', database: ':memory:' },
          },
        },
      }),
    );
    app.register(DatabaseServiceProvider);
    app.register(LontarServiceProvider);
    await app.boot();

    expect(app.migrationPaths()).toEqual([
      join(root, 'database/migrations'),
      packageMigrations,
    ]);

    const connection = new SqliteConnection(':memory:');
    const migrator = new Migrator(connection, app.migrationPaths());
    const ran = await migrator.run();

    expect(ran).toEqual([
      '2026_06_20_000001_create_posts_table.js',
      '2026_06_20_000002_create_users_table.js',
    ]);
  });
});