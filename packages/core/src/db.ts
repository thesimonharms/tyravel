import type { DatabaseConnection, DatabaseManager } from '@pondoknusa/database';
import type { Application } from './application.js';

let dbApplication: Application | undefined;

export function setDbApplication(app: Application): void {
  dbApplication = app;
}

function resolveDb(): DatabaseManager {
  if (!dbApplication) {
    throw new Error('DB facade is not ready. Call setDbApplication(app) during bootstrap.');
  }
  return dbApplication.make<DatabaseManager>('db');
}

export interface DbFacade {
  connection(name?: string): DatabaseConnection;
  transaction<T>(callback: () => Promise<T>, name?: string): Promise<T>;
}

export const DB: DbFacade = {
  connection: (name) => resolveDb().connection(name),
  transaction: (callback, name) => resolveDb().transaction(callback, name),
};