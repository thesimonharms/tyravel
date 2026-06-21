export interface PgConnectionConfig {
  driver: 'postgres';
  host: string;
  port?: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}