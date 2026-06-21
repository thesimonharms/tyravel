import { ConfigRepository } from '@tyravel/config';
import { DatabaseManager } from '@tyravel/database';
import { MailManager } from '@tyravel/mail';
import { Dispatcher, JobRegistry, QueueManager } from '@tyravel/queue';
import {
  NOTIFICATIONS_VIEWS_PATH,
  NotificationManager,
  NotificationRegistry,
  SendQueuedNotification,
  SerializedNotifiable,
  setNotificationSender,
  setQueuedNotificationContext,
  type NotificationQueueBridge,
  type NotificationsConfig,
} from '@tyravel/notifications';
import type { Job } from '@tyravel/queue';
import { ViewEngine } from '@tyravel/views';
import { ServiceProvider } from './service-provider.js';

export class NotificationServiceProvider extends ServiceProvider {
  override register() {
    const config = this.app.make<ConfigRepository>('config');
    const notificationsConfig = config.get<NotificationsConfig>('notifications', {});
    const mail = this.app.make<MailManager>('mail');
    const registry = new NotificationRegistry();

    const database = this.resolveDatabase();
    const queueBridge = this.createQueueBridge();
    const manager = new NotificationManager(mail, database ? {
      connection: database.connection(notificationsConfig.connection),
      table: notificationsConfig.table,
    } : undefined, queueBridge, registry);

    manager.setQueueDefaults({
      connection: notificationsConfig.queueConnection,
      queue: notificationsConfig.queue,
    });

    this.app.instance('notifications', manager);
    this.app.instance('notifications.registry', registry);
    this.app.singleton(NotificationManager, () => manager);
    this.app.singleton(NotificationRegistry, () => registry);
    setNotificationSender(manager);

    setQueuedNotificationContext({
      manager,
      registry,
      SerializedNotifiable,
      container: this.app,
    });

    this.registerQueuedNotificationJob();
  }

  override boot() {
    try {
      const view = this.app.make<ViewEngine>('view');
      view.namespace('notifications', NOTIFICATIONS_VIEWS_PATH);
    } catch {
      // View provider not registered.
    }
  }

  private resolveDatabase(): DatabaseManager | undefined {
    try {
      return this.app.make<DatabaseManager>('db');
    } catch {
      return undefined;
    }
  }

  private createQueueBridge(): NotificationQueueBridge | undefined {
    try {
      const manager = this.app.make<QueueManager>('queue');
      return {
        dispatch: async (
          job: Job,
          options: { connection?: string; queue?: string; delaySeconds?: number } = {},
        ) => {
          const connection = manager.connection(options.connection);
          const dispatcher = new Dispatcher(connection);
          const delay = options.delaySeconds ?? 0;
          if (delay > 0) {
            await dispatcher.dispatchLater(delay, job, options.queue);
            return;
          }
          await dispatcher.dispatch(job, options.queue);
        },
      };
    } catch {
      return undefined;
    }
  }

  private registerQueuedNotificationJob(): void {
    try {
      const jobs = this.app.make<JobRegistry>('jobs.registry');
      jobs.register(SendQueuedNotification);
    } catch {
      // Queue provider not registered.
    }
  }
}