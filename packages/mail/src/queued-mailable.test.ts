import { describe, expect, it } from 'vitest';
import { ArrayMailTransport, MailManager, Mailable } from './index.js';
import { JobRegistry, QueueWorker, SyncQueue } from '@pondoknusa/queue';
import { SendMailable } from './send-mailable.js';
import { setQueuedMailContext } from './queued-mail-context.js';
import type { MailMessage } from './types.js';

class QueuedWelcome extends Mailable {
  override shouldQueue(): boolean {
    return true;
  }

  build(): MailMessage {
    return {
      subject: 'Queued welcome',
      to: [],
      text: 'Later',
    };
  }
}

describe('queued mailables', () => {
  it('dispatches SendMailable on sync queue', async () => {
    const jobs = new JobRegistry();
    jobs.register(SendMailable);
    const worker = new QueueWorker(jobs);
    const queue = new SyncQueue(worker);

    const manager = new MailManager(
      {
        default: 'array',
        from: { address: 'app@example.com' },
        connections: { array: { driver: 'array' } },
      },
      {
        dispatch: async (job) => {
          await queue.push(job);
        },
      },
    );

    setQueuedMailContext({ manager });

    await manager.mailer().to('queued@example.com').send(new QueuedWelcome());

    const transport = manager.transport('array') as ArrayMailTransport;
    expect(transport.messages[0]?.subject).toBe('Queued welcome');
    expect(transport.messages[0]?.to[0]?.address).toBe('queued@example.com');
  });
});