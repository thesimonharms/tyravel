import type { BroadcastManager } from '@pondoknusa/broadcasting';
import type { MailManager } from '@pondoknusa/mail';
import type { Job } from '@pondoknusa/queue';
import type { Notification } from './notification.js';
import type { Notifiable } from './types.js';
import { MailChannel } from './channels/mail-channel.js';
import { DatabaseChannel } from './channels/database-channel.js';
import { BroadcastChannel } from './channels/broadcast-channel.js';
import { SlackChannel } from './channels/slack-channel.js';
import { SmsChannel } from './channels/sms-channel.js';
import { WebhookChannel } from './channels/webhook-channel.js';
import type { DatabaseChannelOptions } from './channels/database-channel.js';
import type { NotificationQueueBridge } from './queue-bridge.js';
import type { NotificationRegistry } from './notification-registry.js';
import { shouldQueue } from './should-queue.js';
import { SendQueuedNotification } from './send-queued-notification.js';
import { serializeNotifiable } from './serialized-notifiable.js';

export class NotificationManager {
  private readonly mailChannel: MailChannel;
  private readonly slackChannel: SlackChannel;
  private readonly webhookChannel: WebhookChannel;
  private readonly smsChannel: SmsChannel;
  private readonly broadcastChannel?: BroadcastChannel;
  private readonly databaseChannel?: DatabaseChannel;
  private queueDefaults: { connection?: string; queue?: string } = {};

  constructor(
    mail: MailManager,
    database?: DatabaseChannelOptions,
    private readonly queue?: NotificationQueueBridge,
    private readonly registry?: NotificationRegistry,
    broadcast?: BroadcastManager,
  ) {
    this.mailChannel = new MailChannel(mail);
    this.slackChannel = new SlackChannel();
    this.webhookChannel = new WebhookChannel();
    this.smsChannel = new SmsChannel();
    this.broadcastChannel = broadcast ? new BroadcastChannel(broadcast) : undefined;
    this.databaseChannel = database ? new DatabaseChannel(database) : undefined;
  }

  setQueueDefaults(options: { connection?: string; queue?: string }): void {
    this.queueDefaults = options;
  }

  async send(notifiable: Notifiable, notification: Notification): Promise<void> {
    this.registry?.registerInstance(notification);

    if (shouldQueue(notification) && this.queue) {
      const job = new SendQueuedNotification({
        notification: notification.id(),
        notifiable: serializeNotifiable(notifiable),
      });
      const options = this.resolveQueueOptions(notification);
      await this.queue.dispatch(job, options);
      return;
    }

    await this.sendNow(notifiable, notification);
  }

  async sendNow(notifiable: Notifiable, notification: Notification): Promise<void> {
    const channels = notification.via(notifiable);
    await Promise.all(
      channels.map((channel) => this.sendOnChannel(notifiable, notification, channel)),
    );
  }

  private resolveQueueOptions(notification: Notification): {
    connection?: string;
    queue?: string;
    delaySeconds?: number;
  } {
    const queued = notification as Notification & {
      connection?: string;
      queue?: string;
      delaySeconds?: number;
    };
    return {
      connection: queued.connection ?? this.queueDefaults.connection,
      queue: queued.queue ?? this.queueDefaults.queue,
      delaySeconds: queued.delaySeconds,
    };
  }

  private async sendOnChannel(
    notifiable: Notifiable,
    notification: Notification,
    channel: string,
  ): Promise<void> {
    switch (channel) {
      case 'mail':
        await this.mailChannel.send(notifiable, notification);
        return;
      case 'database':
        if (!this.databaseChannel) {
          throw new Error('Database notification channel is not configured.');
        }
        await this.databaseChannel.send(notifiable, notification);
        return;
      case 'slack':
        await this.slackChannel.send(notifiable, notification);
        return;
      case 'webhook':
        await this.webhookChannel.send(notifiable, notification);
        return;
      case 'broadcast':
        if (!this.broadcastChannel) {
          throw new Error('Broadcast notification channel is not configured.');
        }
        await this.broadcastChannel.send(notifiable, notification);
        return;
      case 'sms':
        await this.smsChannel.send(notifiable, notification);
        return;
      default:
        throw new Error(`Unknown notification channel [${channel}].`);
    }
  }
}