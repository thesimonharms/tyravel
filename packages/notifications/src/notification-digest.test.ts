import { describe, expect, it } from 'vitest';
import { ArrayMailTransport, MailManager } from '@pondoknusa/mail';
import { Notification } from './notification.js';
import type { Notifiable } from './types.js';
import { NotificationDigest } from './notification-digest.js';
import { NotificationManager } from './notification-manager.js';

class TestUser implements Notifiable {
  constructor(readonly key: string) {}

  getKey() {
    return this.key;
  }

  routeNotificationForMail() {
    return 'ada@example.com';
  }
}

class AlphaNotification extends Notification {
  override via(): Array<'mail'> {
    return ['mail'];
  }

  override toMail() {
    return {
      subject: 'Alpha',
      text: 'First alert',
      to: [{ address: 'ada@example.com' }],
    };
  }
}

class BetaNotification extends Notification {
  override via(): Array<'mail'> {
    return ['mail'];
  }

  override toMail() {
    return {
      subject: 'Beta',
      text: 'Second alert',
      to: [{ address: 'ada@example.com' }],
    };
  }
}

describe('NotificationDigest', () => {
  it('combines multiple notifications into one digest per notifiable', async () => {
    const mail = new MailManager({
      default: 'array',
      from: { address: 'test@example.com' },
      connections: { array: { driver: 'array' } },
    });
    const manager = new NotificationManager(mail);
    const transport = mail.transport('array') as ArrayMailTransport;
    const user = new TestUser('1');

    const digest = new NotificationDigest();
    digest.add(user, new AlphaNotification());
    digest.add(user, new BetaNotification());

    await digest.sendNow(manager);

    expect(transport.messages).toHaveLength(1);
    expect(transport.messages[0]?.subject).toBe('Your notification digest (2)');
    expect(transport.messages[0]?.text).toContain('First alert');
    expect(transport.messages[0]?.text).toContain('Second alert');
  });

  it('sends a single notification without wrapping', async () => {
    const mail = new MailManager({
      default: 'array',
      from: { address: 'test@example.com' },
      connections: { array: { driver: 'array' } },
    });
    const manager = new NotificationManager(mail);
    const transport = mail.transport('array') as ArrayMailTransport;
    const user = new TestUser('1');

    const digest = new NotificationDigest();
    digest.add(user, new AlphaNotification());

    await digest.sendNow(manager);

    expect(transport.messages).toHaveLength(1);
    expect(transport.messages[0]?.subject).toBe('Alpha');
  });
});