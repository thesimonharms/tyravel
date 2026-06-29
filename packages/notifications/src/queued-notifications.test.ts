import { describe, expect, it } from 'vitest';
import { MailManager, ArrayMailTransport } from '@pondoknusa/mail';
import { JobRegistry, QueueWorker, SyncQueue } from '@pondoknusa/queue';
import { Notification } from './notification.js';
import { NotificationManager } from './notification-manager.js';
import { NotificationRegistry } from './notification-registry.js';
import { SendQueuedNotification } from './send-queued-notification.js';
import { SerializedNotifiable, serializeNotifiable } from './serialized-notifiable.js';
import { setQueuedNotificationContext } from './queued-notification-context.js';
import type { Notifiable } from './types.js';

class QueuedPing extends Notification {
  override shouldQueue(): boolean {
    return true;
  }

  override via(): ('mail')[] {
    return ['mail'];
  }

  override toMail() {
    return { subject: 'Queued', to: [], text: 'async' };
  }
}

class User implements Notifiable {
  constructor(
    public id: number,
    public email: string,
  ) {}
  getKey() {
    return this.id;
  }
  routeNotificationForMail() {
    return this.email;
  }
}

describe('queued notifications', () => {
  it('dispatches SendQueuedNotification on sync queue', async () => {
    const mail = new MailManager({
      default: 'array',
      from: { address: 'noreply@example.com' },
      connections: { array: { driver: 'array' } },
    });
    const registry = new NotificationRegistry();
    const jobs = new JobRegistry();
    jobs.register(SendQueuedNotification);
    const worker = new QueueWorker(jobs);
    const queue = new SyncQueue(worker);

    const manager = new NotificationManager(
      mail,
      undefined,
      {
        dispatch: async (job) => {
          await queue.push(job);
        },
      },
      registry,
    );

    setQueuedNotificationContext({
      manager,
      registry,
      SerializedNotifiable,
    });

    const user = new User(9, 'queued@example.com');
    registry.register(QueuedPing);
    await manager.send(user, new QueuedPing());

    const transport = mail.transport('array') as ArrayMailTransport;
    expect(transport.messages[0]?.subject).toBe('Queued');
    expect(serializeNotifiable(user).mail).toBe('queued@example.com');
  });
});