import type { Application } from '@pondoknusa/core';
import type { Notification, NotificationManager, Notifiable } from '@pondoknusa/notifications';

export interface RecordedNotification {
  notifiable: Notifiable;
  notification: Notification;
  channels: string[];
}

export class NotificationFake {
  readonly sent: RecordedNotification[] = [];

  constructor(private readonly manager: NotificationManager) {}

  install(): void {
    this.manager.sendNow = async (notifiable, notification) => {
      this.sent.push({
        notifiable,
        notification,
        channels: notification.via(notifiable),
      });
    };
    this.manager.send = async (notifiable, notification) => {
      this.sent.push({
        notifiable,
        notification,
        channels: notification.via(notifiable),
      });
    };
  }

  assertSent(predicate: (entry: RecordedNotification) => boolean): void {
    if (!this.sent.some(predicate)) {
      throw new Error('Expected notification was not sent.');
    }
  }

  assertNothingSent(): void {
    if (this.sent.length > 0) {
      throw new Error(`${this.sent.length} unexpected notification(s) were sent.`);
    }
  }

  clear(): void {
    this.sent.length = 0;
  }
}

export function notificationFake(app: Application): NotificationFake {
  const manager = app.make<NotificationManager>('notifications');
  const fake = new NotificationFake(manager);
  fake.install();
  return fake;
}