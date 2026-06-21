import pg from 'pg';
import type { DatabaseConnection, QueryResult } from '@tyravel/database';
import { PostgresGrammar, type SqlGrammar } from '@tyravel/database';
import type { PgConnectionConfig } from './types.js';

const { Pool } = pg;

type RowValue = string | number | bigint | boolean | null | undefined;

export class PostgresConnection implements DatabaseConnection {
  readonly grammar: SqlGrammar = new PostgresGrammar();
  private readonly pool: pg.Pool;

  constructor(config: PgConnectionConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port ?? 5432,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    });
  }

  async query(sql: string, bindings: RowValue[] = []): Promise<QueryResult> {
    const result = await this.pool.query(sql, normalizeBindings(bindings));
    const rows = result.rows as Record<string, unknown>[];
    const lastInsertId = rows[0]?.id;

    return {
      rows,
      changes: result.rowCount ?? 0,
      lastInsertId:
        typeof lastInsertId === 'number' || typeof lastInsertId === 'bigint'
          ? lastInsertId
          : undefined,
    };
  }

  async exec(sql: string): Promise<void> {
    await this.pool.query(sql);
  }

  async transaction<T>(
    callback: (connection: DatabaseConnection) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const connection = new PostgresTransactionConnection(client);
      const result = await callback(connection);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

class PostgresTransactionConnection implements DatabaseConnection {
  readonly grammar: SqlGrammar = new PostgresGrammar();

  constructor(private readonly client: pg.PoolClient) {}

  async query(sql: string, bindings: RowValue[] = []): Promise<QueryResult> {
    const result = await this.client.query(sql, normalizeBindings(bindings));
    const rows = result.rows as Record<string, unknown>[];
    const lastInsertId = rows[0]?.id;

    return {
      rows,
      changes: result.rowCount ?? 0,
      lastInsertId:
        typeof lastInsertId === 'number' || typeof lastInsertId === 'bigint'
          ? lastInsertId
          : undefined,
    };
  }

  async exec(sql: string): Promise<void> {
    await this.client.query(sql);
  }

  async transaction<T>(
    callback: (connection: DatabaseConnection) => Promise<T>,
  ): Promise<T> {
    return callback(this);
  }
}

function normalizeBindings(bindings: RowValue[]): RowValue[] {
  return bindings.map((binding) => (binding === undefined ? null : binding));
}