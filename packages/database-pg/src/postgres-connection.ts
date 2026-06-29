import { createHash } from 'node:crypto';
import pg from 'pg';
import type { DatabaseConnection, QueryResult } from '@pondoknusa/database';
import { PostgresGrammar, type SqlGrammar } from '@pondoknusa/database';
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
    const result = await runPgQuery(this.pool, sql, bindings);
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
    const result = await runPgQuery(this.client, sql, bindings);
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

function preparedStatementName(sql: string): string {
  return `tyr_${createHash('sha256').update(sql).digest('hex').slice(0, 32)}`;
}

async function runPgQuery(
  client: { query: pg.Pool['query'] },
  sql: string,
  bindings: RowValue[],
): Promise<pg.QueryResult<pg.QueryResultRow>> {
  const normalized = normalizeBindings(bindings);
  const trimmed = sql.trim().toLowerCase();

  if (!trimmed.startsWith('select') && !trimmed.startsWith('with')) {
    return client.query(sql, normalized);
  }

  try {
    return await client.query({
      name: preparedStatementName(sql),
      text: sql,
      values: normalized,
    });
  } catch {
    return client.query(sql, normalized);
  }
}