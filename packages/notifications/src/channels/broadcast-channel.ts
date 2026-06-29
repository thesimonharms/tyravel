import type { BroadcastManager } from '@pondoknusa/broadcasting';
import type { Notification } from '../notification.js';
import type { Notifiable } from '../types.js';

export interface BroadcastMessage {
  event?: string;
  channels?: string[];
  data: Record<string, unknown>;
}

export class BroadcastChannel {
  constructor(private readonly broadcast: BroadcastManager) {}

  async send(notifiable: Notifiable, notification: Notification): Promise<void> {
    const message = notification.toBroadcast
      ? await notification.toBroadcast(notifiable)
      : {
          event: 'NotificationSent',
          channels: [
            `App.Models.${notifiable.constructor.name}.${notifiable.getKey()}`,
          ],
          data: {
            type: notification.id(),
          },
        };

    await this.broadcast.connection().broadcast({
      event: message.event ?? 'NotificationSent',
      channels: message.channels ?? [
        `App.Models.${notifiable.constructor.name}.${notifiable.getKey()}`,
      ],
      data: message.data,
    });
  }
}