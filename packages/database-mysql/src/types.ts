export interface MysqlConnectionConfig {
  driver: 'mysql';
  host: string;
  port?: number;
  database: string;
  username: string;
  password: string;
}