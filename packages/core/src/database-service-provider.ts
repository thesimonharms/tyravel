import { join } from 'node:path';
import { ConfigRepository } from '@tyravel/config';
import { DatabaseManager, Model } from '@tyravel/database';
import type { DatabaseConfig } from '@tyravel/database';
import { ServiceProvider } from './service-provider.js';

export class DatabaseServiceProvider extends ServiceProvider {
  override register() {
    this.loadMigrationsFrom(join(this.app.basePath, 'database/migrations'));

    const config = this.app.make<ConfigRepository>('config');
    const databaseConfig = config.get<DatabaseConfig>('database');
    const manager = new DatabaseManager(databaseConfig, this.app.basePath);

    this.app.instance('db', manager);
    this.app.singleton(DatabaseManager, () => manager);

    const connection = manager.connection();
    Model.setConnectionResolver(() => connection);
  }
}