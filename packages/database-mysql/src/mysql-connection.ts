import mysql from 'mysql2/promise';
import type { DatabaseConnection, QueryResult } from '@pondoknusa/database';
import { MysqlGrammar, type SqlGrammar } from '@pondoknusa/database';
import type { MysqlConnectionConfig } from './types.js';

type RowValue = string | number | bigint | boolean | null | undefined;

export class MysqlConnection implements DatabaseConnection {
  readonly grammar: SqlGrammar = new MysqlGrammar();
  private readonly pool: mysql.Pool;

  constructor(config: MysqlConnectionConfig) {
    this.pool = mysql.createPool({
      host: config.host,
      port: config.port ?? 3306,
      database: config.database,
      user: config.username,
      password: config.password,
    });
  }

  async query(sql: string, bindings: RowValue[] = []): Promise<QueryResult> {
    const [result] = await this.pool.query(sql, normalizeBindings(bindings));

    if (Array.isArray(result)) {
      return {
        rows: result as Record<string, unknown>[],
        changes: 0,
      };
    }

    const header = result as mysql.ResultSetHeader;
    return {
      rows: [],
      changes: header.affectedRows,
      lastInsertId: header.insertId,
    };
  }

  async exec(sql: string): Promise<void> {
    await this.pool.query(sql);
  }

  async transaction<T>(
    callback: (connection: DatabaseConnection) => Promise<T>,
  ): Promise<T> {
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();
      const transactional = new MysqlTransactionConnection(connection);
      const result = await callback(transactional);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

class MysqlTransactionConnection implements DatabaseConnection {
  readonly grammar: SqlGrammar = new MysqlGrammar();
  private readonly statementCache = new Map<string, mysql.PreparedStatementInfo>();

  constructor(private readonly connection: mysql.PoolConnection) {}

  async query(sql: string, bindings: RowValue[] = []): Promise<QueryResult> {
    const [result] = await this.runPrepared(sql, normalizeBindings(bindings));

    if (Array.isArray(result)) {
      return {
        rows: result as Record<string, unknown>[],
        changes: 0,
      };
    }

    const header = result as mysql.ResultSetHeader;
    return {
      rows: [],
      changes: header.affectedRows,
      lastInsertId: header.insertId,
    };
  }

  async exec(sql: string): Promise<void> {
    await this.connection.query(sql);
  }

  async transaction<T>(
    callback: (connection: DatabaseConnection) => Promise<T>,
  ): Promise<T> {
    return callback(this);
  }

  private async runPrepared(
    sql: string,
    bindings: RowValue[],
  ): Promise<[mysql.QueryResult, mysql.FieldPacket[]]> {
    const trimmed = sql.trim().toLowerCase();

    if (!trimmed.startsWith('select')) {
      return this.connection.query(sql, bindings);
    }

    try {
      let statement = this.statementCache.get(sql);
      if (!statement) {
        statement = await this.connection.prepare(sql);
        this.statementCache.set(sql, statement);
      }

      return statement.execute(bindings);
    } catch {
      return this.connection.query(sql, bindings);
    }
  }
}

function normalizeBindings(bindings: RowValue[]): RowValue[] {
  return bindings.map((binding) => (binding === undefined ? null : binding));
}