import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { DatabaseConnection, QueryResult } from './connection.js';
import { SqliteGrammar, type SqlGrammar } from './grammar.js';
import type { RowValue } from './types.js';

interface SqliteStatement {
  all(...params: RowValue[]): unknown[];
  get(...params: RowValue[]): unknown;
  run(...params: RowValue[]): { changes: number; lastInsertRowid: number | bigint };
}

interface SqliteDatabase {
  close(): void;
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
}

type SqliteModule = {
  DatabaseSync: new (path: string) => SqliteDatabase;
};

export class SqliteConnection implements DatabaseConnection {
  readonly grammar: SqlGrammar = new SqliteGrammar();
  private readonly ready: Promise<void>;
  private sqliteDb?: SqliteDatabase;

  constructor(databasePath: string, basePath = process.cwd()) {
    this.ready = this.initialize(databasePath, basePath);
  }

  /** Open a SQLite connection after async directory setup. */
  static async connect(
    databasePath: string,
    basePath = process.cwd(),
  ): Promise<SqliteConnection> {
    const connection = new SqliteConnection(databasePath, basePath);
    await connection.ready;
    return connection;
  }

  async query(sql: string, bindings: RowValue[] = []): Promise<QueryResult> {
    const database = await this.getDatabase();
    const statement = database.prepare(sql);
    const trimmed = sql.trim().toLowerCase();

    if (trimmed.startsWith('select') || trimmed.startsWith('pragma')) {
      const rows = statement.all(...normalizeBindings(bindings)) as Record<string, unknown>[];
      return { rows, changes: 0 };
    }

    const result = statement.run(...normalizeBindings(bindings));
    return {
      rows: [],
      changes: result.changes,
      lastInsertId: result.lastInsertRowid,
    };
  }

  async exec(sql: string): Promise<void> {
    const database = await this.getDatabase();
    database.exec(sql);
  }

  async transaction<T>(
    callback: (connection: DatabaseConnection) => Promise<T>,
  ): Promise<T> {
    await this.exec('BEGIN');
    try {
      const result = await callback(this);
      await this.exec('COMMIT');
      return result;
    } catch (error) {
      await this.exec('ROLLBACK');
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.ready;
    this.sqliteDb?.close();
    this.sqliteDb = undefined;
  }

  private async initialize(databasePath: string, basePath: string): Promise<void> {
    const resolvedPath = databasePath === ':memory:'
      ? ':memory:'
      : resolve(basePath, databasePath);

    if (resolvedPath !== ':memory:') {
      await mkdir(dirname(resolvedPath), { recursive: true });
    }

    const sqlite = await loadSqliteModule();
    this.sqliteDb = new sqlite.DatabaseSync(resolvedPath);
  }

  private async getDatabase(): Promise<SqliteDatabase> {
    await this.ready;
    if (!this.sqliteDb) {
      throw new Error('SQLite connection is closed.');
    }
    return this.sqliteDb;
  }
}

async function loadSqliteModule(): Promise<SqliteModule> {
  try {
    return (await import('node:sqlite')) as SqliteModule;
  } catch {
    throw new Error(
      'SQLite support requires Node.js 22.5+ with the built-in node:sqlite module.',
    );
  }
}

function normalizeBindings(bindings: RowValue[]): RowValue[] {
  return bindings.map((binding) => (binding === undefined ? null : binding));
}