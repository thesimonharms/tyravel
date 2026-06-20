import { ConfigRepository } from '@tyravel/config';
import { DatabaseManager } from '@tyravel/database';
import {
  Dispatcher,
  FailedJobRepository,
  JobRegistry,
  QueueManager,
  QueueProcessor,
  QueueWorker,
  type QueueConfig,
} from '@tyravel/queue';
import { ServiceProvider } from './service-provider.js';

export class QueueServiceProvider extends ServiceProvider {
  override register() {
    const config = this.app.make<ConfigRepository>('config');
    const queueConfig = config.get<QueueConfig>('queue');
    const registry = new JobRegistry();

    this.app.instance('jobs.registry', registry);
    this.app.singleton(JobRegistry, () => registry);

    const database = this.resolveDatabaseManager();

    const worker = new QueueWorker(registry, this.app);
    const manager = new QueueManager(queueConfig, worker, database);
    const dispatcher = new Dispatcher(manager.connection());
    const failedJobs = this.createFailedJobRepository(database, queueConfig);
    const processor = new QueueProcessor(manager, registry, worker, { failedJobs });

    this.app.instance('queue', manager);
    this.app.singleton(QueueManager, () => manager);
    this.app.instance('queue.dispatcher', dispatcher);
    this.app.singleton(Dispatcher, () => dispatcher);
    if (failedJobs) {
      this.app.instance('queue.failed', failedJobs);
      this.app.singleton(FailedJobRepository, () => failedJobs);
    }
    this.app.instance('queue.processor', processor);
    this.app.singleton(QueueProcessor, () => processor);
  }

  private resolveDatabaseManager(): DatabaseManager | undefined {
    try {
      return this.app.make<DatabaseManager>('db');
    } catch {
      return undefined;
    }
  }

  private createFailedJobRepository(
    database: DatabaseManager | undefined,
    queueConfig: QueueConfig,
  ): FailedJobRepository | undefined {
    if (!database) {
      return undefined;
    }

    const failedConfig = queueConfig.failed ?? {};
    const defaultConnectionConfig = queueConfig.connections[queueConfig.default];
    const dbConnectionName =
      failedConfig.database ??
      (defaultConnectionConfig?.driver === 'database'
        ? defaultConnectionConfig.connection
        : undefined);

    const connection = database.connection(dbConnectionName);
    return new FailedJobRepository(connection, failedConfig);
  }
}