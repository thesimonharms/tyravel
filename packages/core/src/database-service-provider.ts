import { join } from 'node:path';
import { ConfigRepository } from '@tyravel/config';
import { DatabaseManager, Model, resolvePoolWarmupEnabled } from '@tyravel/database';
import type { DatabaseConfig } from '@tyravel/database';
import { ServiceProvider } from './service-provider.js';

export class DatabaseServiceProvider extends ServiceProvider {
  override async register() {
    this.loadMigrationsFrom(join(this.app.basePath, 'database/migrations'));

    const config = this.app.make<ConfigRepository>('config');
    const databaseConfig = config.get<DatabaseConfig>('database');
    const manager = new DatabaseManager(databaseConfig, this.app.basePath);

    this.app.instance('db', manager);
    this.app.singleton(DatabaseManager, () => manager);
  }

  override async boot() {
    const config = this.app.make<ConfigRepository>('config');
    const databaseConfig = config.get<DatabaseConfig>('database');
    const manager = this.app.make<DatabaseManager>('db');
    const connection = manager.connection();
    Model.setConnectionResolver(() => connection);

    if (resolvePoolWarmupEnabled(databaseConfig)) {
      void manager.warmPools().catch((error) => {
        console.error(
          '[database] Pool warm-up failed:',
          error instanceof Error ? error.message : String(error),
        );
      });
    }
  }
}