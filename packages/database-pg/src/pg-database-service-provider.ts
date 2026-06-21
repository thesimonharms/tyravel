import { registerPgDatabaseDriver } from './register.js';

export class PgDatabaseServiceProvider {
  constructor(_app: unknown) {}

  register(): void {
    registerPgDatabaseDriver();
  }
}