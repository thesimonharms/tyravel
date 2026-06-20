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
} from '@tyravel/core';
import { DatabaseManager, Migrator } from '@tyravel/database';
import { TestCase, createHttpKernel, wireFacades } from '@tyravel/testing';
import { HttpTestClient } from '@tyravel/testing';
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
    process.env.QUEUE_CONNECTION = 'sync';

    this.app = await this.createApplication();

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
    this.http = new HttpTestClient(this.kernel);

    const db = this.app.make(DatabaseManager);
    const migrator = new Migrator(
      db.connection(),
      join(this.app.basePath, 'database/migrations'),
    );
    await migrator.run();
  }
}