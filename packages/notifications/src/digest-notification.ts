import type { MailMessage } from '@pondoknusa/mail';
import type { BroadcastMessage } from './channels/broadcast-channel.js';
import type { SlackMessage } from './channels/slack-channel.js';
import type { SmsMessage } from './channels/sms-channel.js';
import type { WebhookMessage } from './channels/webhook-channel.js';
import { Notification } from './notification.js';
import type { NotificationChannel, Notifiable } from './types.js';

export interface DigestOptions {
  channels?: NotificationChannel[];
  subject?: string;
  smsMaxLength?: number;
}

export class DigestNotification extends Notification {
  constructor(
    private readonly items: Notification[],
    private readonly options: DigestOptions = {},
  ) {
    super();
  }

  getItems(): Notification[] {
    return [...this.items];
  }

  override via(notifiable: Notifiable): NotificationChannel[] {
    if (this.options.channels?.length) {
      return this.options.channels;
    }

    const channels = new Set<NotificationChannel>();
    for (const item of this.items) {
      for (const channel of item.via(notifiable)) {
        channels.add(channel);
      }
    }
    return [...channels];
  }

  override shouldQueue(): boolean {
    return this.items.some((item) => item.shouldQueue?.() ?? false);
  }

  override async toMail(notifiable: Notifiable): Promise<MailMessage> {
    const sections: string[] = [];

    for (const item of this.items) {
      if (!item.toMail) {
        sections.push(`• ${item.id()}`);
        continue;
      }

      const message = await item.toMail(notifiable);
      const body = message.text ?? message.html ?? message.subject;
      sections.push(body ? String(body) : item.id());
    }

    return {
      subject: this.options.subject ?? `Your notification digest (${this.items.length})`,
      text: sections.join('\n\n---\n\n'),
      to: [{ address: 'digest@placeholder' }],
    };
  }

  override async toSlack(notifiable: Notifiable): Promise<SlackMessage> {
    const lines: string[] = [];

    for (const item of this.items) {
      if (!item.toSlack) {
        lines.push(`• ${item.id()}`);
        continue;
      }

      const message = await item.toSlack(notifiable);
      lines.push(message.text);
    }

    const first = this.items.find((item) => item.toSlack);
    const webhookUrl = first ? (await first.toSlack!(notifiable)).webhookUrl : '';

    return {
      webhookUrl,
      text: lines.join('\n'),
    };
  }

  override async toSms(notifiable: Notifiable): Promise<SmsMessage> {
    const lines: string[] = [];

    for (const item of this.items) {
      if (!item.toSms) {
        lines.push(item.id());
        continue;
      }

      const message = await item.toSms(notifiable);
      lines.push(message.body);
    }

    const first = this.items.find((item) => item.toSms);
    const sms = first ? await first.toSms!(notifiable) : { to: '', body: '' };
    const maxLength = this.options.smsMaxLength ?? 320;
    const body = lines.join(' | ').slice(0, maxLength);

    return {
      to: sms.to,
      from: sms.from,
      body,
    };
  }

  override async toDatabase(notifiable: Notifiable): Promise<Record<string, unknown>> {
    const entries: Record<string, unknown>[] = [];

    for (const item of this.items) {
      entries.push(
        item.toDatabase
          ? await item.toDatabase(notifiable)
          : { type: item.id() },
      );
    }

    return {
      digest: true,
      count: this.items.length,
      notifications: entries,
    };
  }

  override async toWebhook(notifiable: Notifiable): Promise<WebhookMessage> {
    const payloads: unknown[] = [];

    for (const item of this.items) {
      payloads.push(
        item.toWebhook ? await item.toWebhook(notifiable) : { type: item.id() },
      );
    }

    const first = this.items.find((item) => item.toWebhook);
    const webhook = first ? await first.toWebhook!(notifiable) : { url: '', body: {} };

    return {
      url: webhook.url,
      body: {
        digest: true,
        count: this.items.length,
        notifications: payloads,
      },
    };
  }

  override async toBroadcast(notifiable: Notifiable): Promise<BroadcastMessage> {
    const payloads: Record<string, unknown>[] = [];

    for (const item of this.items) {
      payloads.push(
        item.toBroadcast
          ? (await item.toBroadcast(notifiable)).data
          : { type: item.id() },
      );
    }

    const first = this.items.find((item) => item.toBroadcast);
    const broadcast = first ? await first.toBroadcast!(notifiable) : undefined;

    return {
      event: broadcast?.event ?? 'NotificationDigest',
      channels: broadcast?.channels,
      data: {
        digest: true,
        count: this.items.length,
        notifications: payloads,
      },
    };
  }
}