import { Job } from '@pondoknusa/queue';
import { getQueuedNotificationContext } from './queued-notification-context.js';

export interface SendQueuedNotificationData extends Record<string, unknown> {
  notification: string;
  notifiable: {
    type: string;
    id: string | number;
    mail?: string;
  };
}

export class SendQueuedNotification extends Job<SendQueuedNotificationData> {
  override async handle(): Promise<void> {
    const context = getQueuedNotificationContext();
    const notification = context.registry.create(this.data.notification);
    const notifiable = new context.SerializedNotifiable(this.data.notifiable);
    await context.manager.sendNow(notifiable, notification);
  }
}