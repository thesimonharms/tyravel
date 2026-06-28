export type Row = Record<string, unknown>;
export type RowValue = string | number | bigint | boolean | null | undefined;
export type WhereOperator = '=' | '!=' | '<' | '>' | '<=' | '>=' | 'like' | 'in';

export interface WhereClause {
  type: 'basic' | 'in' | 'null';
  column: string;
  operator: WhereOperator | 'is' | 'is not';
  value: unknown;
  boolean: 'and' | 'or';
}

export interface SqliteConnectionConfig {
  driver: 'sqlite';
  database: string;
}

export type ConnectionConfig =
  | SqliteConnectionConfig
  | ({ driver: string } & Record<string, unknown>);

export interface DatabaseConfig {
  default: string;
  connections: Record<string, ConnectionConfig>;
  /** Fire-and-forget SELECT 1 on boot (overridden by DB_POOL_WARMUP env). */
  poolWarmup?: boolean;
}

export type DatabaseDriverFactory = (
  config: ConnectionConfig,
  basePath: string,
) => import('./connection.js').DatabaseConnection;