import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { DatabaseConnection } from './connection.js';
import type { Migration } from './migration.js';
import { migrationsTableSql, SchemaBuilder } from './schema/schema-builder.js';

interface MigrationFile {
  name: string;
  directory: string;
}

export class Migrator {
  private readonly migrationDirectories: string[];

  constructor(
    private readonly connection: DatabaseConnection,
    migrationsPath: string | string[],
  ) {
    this.migrationDirectories = Array.isArray(migrationsPath)
      ? migrationsPath
      : [migrationsPath];
  }

  async ensureMigrationsTable(): Promise<void> {
    await this.connection.exec(migrationsTableSql(this.connection.grammar));
  }

  async pending(): Promise<string[]> {
    const files = await this.pendingFiles();
    return files.map((file) => file.name);
  }

  async run(): Promise<string[]> {
    const pending = await this.pendingFiles();
    if (pending.length === 0) {
      return [];
    }

    const batch = (await this.latestBatch()) + 1;
    const schema = new SchemaBuilder(this.connection);
    const ran: string[] = [];

    for (const file of pending) {
      const MigrationClass = await this.load(file);
      const migration = new MigrationClass();
      await migration.up(this.connection, schema);
      await this.record(file.name, batch);
      ran.push(file.name);
    }

    return ran;
  }

  private async pendingFiles(): Promise<MigrationFile[]> {
    await this.ensureMigrationsTable();
    const executed = await this.executed();
    return (await this.files()).filter((file) => !executed.includes(file.name));
  }

  private async executed(): Promise<string[]> {
    const grammar = this.connection.grammar;
    const result = await this.connection.query(
      `SELECT ${grammar.wrapIdentifier('migration')} FROM ${grammar.wrapIdentifier('migrations')} ORDER BY ${grammar.wrapIdentifier('id')} ASC`,
    );
    return result.rows.map((row) => String(row.migration));
  }

  private async latestBatch(): Promise<number> {
    const grammar = this.connection.grammar;
    const batchColumn = grammar.wrapIdentifier('batch');
    const result = await this.connection.query(
      `SELECT MAX(${batchColumn}) as ${batchColumn} FROM ${grammar.wrapIdentifier('migrations')}`,
    );
    const batch = result.rows[0]?.batch;
    return typeof batch === 'number' ? batch : 0;
  }

  private async files(): Promise<MigrationFile[]> {
    const files: MigrationFile[] = [];
    const seen = new Set<string>();

    for (const directory of this.migrationDirectories) {
      try {
        for (const name of await readdir(directory)) {
          if (!name.endsWith('.ts') && !name.endsWith('.js')) {
            continue;
          }
          if (seen.has(name)) {
            continue;
          }
          seen.add(name);
          files.push({ name, directory });
        }
      } catch {
        continue;
      }
    }

    return files.sort((left, right) => left.name.localeCompare(right.name));
  }

  private async load(file: MigrationFile): Promise<new () => Migration> {
    const moduleUrl = pathToFileURL(join(file.directory, file.name)).href;
    const loaded = await import(moduleUrl);
    const MigrationClass = loaded.default ?? Object.values(loaded).find(
      (value) => typeof value === 'function',
    );

    if (typeof MigrationClass !== 'function') {
      throw new Error(`Migration class not found in ${file.name}`);
    }

    return MigrationClass as new () => Migration;
  }

  private async record(migration: string, batch: number): Promise<void> {
    const grammar = this.connection.grammar;
    const table = grammar.wrapIdentifier('migrations');
    const sql = `INSERT INTO ${table} (${grammar.wrapIdentifier('migration')}, ${grammar.wrapIdentifier('batch')}, ${grammar.wrapIdentifier('executed_at')}) VALUES (${grammar.parameter(1)}, ${grammar.parameter(2)}, ${grammar.parameter(3)})`;
    await this.connection.query(sql, [migration, batch, new Date().toISOString()]);
  }
}