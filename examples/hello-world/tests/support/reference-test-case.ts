import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Application,
  AuthServiceProvider,
  CacheServiceProvider,
  ConfigServiceProvider,
  DatabaseServiceProvider,
  EventServiceProvider,
  MailServiceProvider,
  NotificationServiceProvider,
  QueueServiceProvider,
  ViewServiceProvider,
  setRouteApplication,
  setViewApplication,
} from '@pondoknusa/core';
import { DatabaseManager, Migrator } from '@pondoknusa/database';
import {
  JobRegistry,
  QueueManager,
  QueueWorker,
  isWorkerQueue,
} from '@pondoknusa/queue';
import { TestCase, createHttpKernel, createTestingMiddleware, wireFacades } from '@pondoknusa/testing';
import { HttpTestClient } from '@pondoknusa/testing';
import { AppServiceProvider } from '../../src/providers/app-service-provider.js';

const supportDir = dirname(fileURLToPath(import.meta.url));

export class ReferenceTestCase extends TestCase {
  protected createApplication(): Application {
    return new Application(join(supportDir, '../..'));
  }

  protected override providers() {
    return [
      ConfigServiceProvider,
      DatabaseServiceProvider,
      CacheServiceProvider,
      MailServiceProvider,
      NotificationServiceProvider,
      QueueServiceProvider,
      EventServiceProvider,
      AuthServiceProvider,
      ViewServiceProvider,
      AppServiceProvider,
    ];
  }

  override async setUp(): Promise<void> {
    process.env.DB_DATABASE = ':memory:';
    process.env.MAIL_MAILER = 'array';
    process.env.QUEUE_CONNECTION = 'database';

    this.app = await this.createApplication();
    this.app.use(createTestingMiddleware());

    for (const Provider of this.providers()) {
      this.app.register(Provider);
    }

    setRouteApplication(this.app);
    setViewApplication(this.app);

    await this.app.boot();

    const { registerRoutes } = await import('../../src/routes/index.js');
    registerRoutes();

    wireFacades(this.app);
    this.kernel = createHttpKernel(this.app);
    this.http = new HttpTestClient(this.kernel).withCsrf();

    const db = this.app.make(DatabaseManager);
    const migrator = new Migrator(db.connection(), this.app.migrationPaths());
    await migrator.run();
  }

  async drainQueue(queue = 'default'): Promise<number> {
    const manager = this.app.make(QueueManager);
    const registry = this.app.make(JobRegistry);
    const worker = new QueueWorker(registry, this.app);
    const connectionName = process.env.QUEUE_CONNECTION ?? 'database';
    const connection = manager.connection(connectionName);

    if (!isWorkerQueue(connection)) {
      return 0;
    }

    let processed = 0;

    while (true) {
      const record = await connection.pop(queue);
      if (!record) {
        break;
      }

      await worker.process(
        connection.decode(record),
        async (next) => {
          await connection.pushRaw(next, queue);
        },
        queue,
      );
      await connection.deleteJob(record.id);
      processed += 1;
    }

    return processed;
  }
}