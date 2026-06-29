import { describe, expect, it } from 'vitest';
import { MailManager } from '@pondoknusa/mail';
import { ArrayMailTransport } from '@pondoknusa/mail';
import { Notification } from './notification.js';
import { NotificationManager } from './notification-manager.js';
import type { Notifiable } from './types.js';

class PingNotification extends Notification {
  override via(): ('mail')[] {
    return ['mail'];
  }

  override toMail() {
    return {
      subject: 'Ping',
      to: [],
      text: 'pong',
    };
  }
}

class User implements Notifiable {
  constructor(
    public id: number,
    public email: string,
  ) {}

  getKey(): number {
    return this.id;
  }

  routeNotificationForMail(): string {
    return this.email;
  }
}

describe('NotificationManager', () => {
  it('sends mail channel notifications', async () => {
    const mail = new MailManager({
      default: 'array',
      from: { address: 'noreply@example.com' },
      connections: { array: { driver: 'array' } },
    });
    const manager = new NotificationManager(mail);
    await manager.send(new User(1, 'a@b.com'), new PingNotification());
    const transport = mail.transport('array') as ArrayMailTransport;
    expect(transport.messages[0]?.subject).toBe('Ping');
  });
});