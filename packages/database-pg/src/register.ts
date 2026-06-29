import { DatabaseManager, type ConnectionConfig } from '@pondoknusa/database';
import { PostgresConnection } from './postgres-connection.js';
import type { PgConnectionConfig } from './types.js';

export function registerPgDatabaseDriver(): void {
  DatabaseManager.extend(
    'postgres',
    (config: ConnectionConfig) =>
      new PostgresConnection(config as unknown as PgConnectionConfig),
  );
}