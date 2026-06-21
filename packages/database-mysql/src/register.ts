import { DatabaseManager, type ConnectionConfig } from '@tyravel/database';
import { MysqlConnection } from './mysql-connection.js';
import type { MysqlConnectionConfig } from './types.js';

export function registerMysqlDatabaseDriver(): void {
  DatabaseManager.extend(
    'mysql',
    (config: ConnectionConfig) =>
      new MysqlConnection(config as unknown as MysqlConnectionConfig),
  );
}