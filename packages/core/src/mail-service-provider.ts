import { ConfigRepository } from '@tyravel/config';
import { MailManager, SendMailable, setQueuedMailContext, type MailConfig, type MailQueueBridge } from '@tyravel/mail';
import { Dispatcher, JobRegistry, QueueManager } from '@tyravel/queue';
import type { Job } from '@tyravel/queue';
import { ServiceProvider } from './service-provider.js';

export class MailServiceProvider extends ServiceProvider {
  override register() {
    const config = this.app.make<ConfigRepository>('config');
    const mailConfig = config.get<MailConfig>('mail');
    const queueBridge = this.createQueueBridge();
    const manager = new MailManager(mailConfig, queueBridge);

    manager.setQueueDefaults({
      connection: mailConfig.queueConnection,
      queue: mailConfig.queue,
    });

    this.app.instance('mail', manager);
    this.app.singleton(MailManager, () => manager);
    setQueuedMailContext({ manager });

    this.registerSendMailableJob();
  }

  private createQueueBridge(): MailQueueBridge | undefined {
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

  private registerSendMailableJob(): void {
    try {
      const jobs = this.app.make<JobRegistry>('jobs.registry');
      jobs.register(SendMailable);
    } catch {
      // Queue provider not registered.
    }
  }
}