import { registerMysqlDatabaseDriver } from './register.js';

export class MysqlDatabaseServiceProvider {
  constructor(_app: unknown) {}

  register(): void {
    registerMysqlDatabaseDriver();
  }
}