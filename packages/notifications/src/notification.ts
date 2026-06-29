import type { MailMessage } from '@pondoknusa/mail';
import type { BroadcastMessage } from './channels/broadcast-channel.js';
import type { SlackMessage } from './channels/slack-channel.js';
import type { SmsMessage } from './channels/sms-channel.js';
import type { WebhookMessage } from './channels/webhook-channel.js';
import type { NotificationChannel, Notifiable } from './types.js';

export abstract class Notification {
  abstract via(notifiable: Notifiable): NotificationChannel[];

  /** When true (via ShouldQueue + override), notification is pushed to the queue. */
  shouldQueue?(): boolean;

  /** Optional queue routing (Laravel-style). */
  connection?: string;
  queue?: string;
  delaySeconds?: number;
  locale?: string;

  toMail?(notifiable: Notifiable): MailMessage | Promise<MailMessage>;

  toDatabase?(notifiable: Notifiable): Record<string, unknown> | Promise<Record<string, unknown>>;

  toSlack?(notifiable: Notifiable): SlackMessage | Promise<SlackMessage>;

  toWebhook?(notifiable: Notifiable): WebhookMessage | Promise<WebhookMessage>;

  toBroadcast?(notifiable: Notifiable): BroadcastMessage | Promise<BroadcastMessage>;

  toSms?(notifiable: Notifiable): SmsMessage | Promise<SmsMessage>;

  id(): string {
    return this.constructor.name;
  }
}