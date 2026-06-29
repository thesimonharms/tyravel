import { describe, expect, it, vi } from 'vitest';
import type { Job } from '@pondoknusa/queue';
import { EventDispatcher } from './event-dispatcher.js';
import { EventRegistry } from './event-registry.js';
import { ListenerRegistry } from './listener-registry.js';
import { Event, Listener } from './types.js';
import { QueuedListener, resolveQueuedListenerMetadata } from './should-queue.js';

class OrderPlaced extends Event<{ orderId: string }> {}

class SyncAudit extends Listener<OrderPlaced> {
  static handled: string[] = [];

  override async handle(event: OrderPlaced): Promise<void> {
    SyncAudit.handled.push(event.data.orderId);
  }
}

class QueuedNotify extends QueuedListener<OrderPlaced> {
  static handled: string[] = [];

  override async handle(event: OrderPlaced): Promise<void> {
    QueuedNotify.handled.push(event.data.orderId);
  }
}

describe('queued listeners', () => {
  it('defaults queued listener connection to database', () => {
    class Example extends QueuedListener<OrderPlaced> {
      override async handle(): Promise<void> {}
    }

    expect(resolveQueuedListenerMetadata(Example)).toEqual({
      connection: 'database',
      queue: 'default',
      delaySeconds: 0,
    });
  });

  it('pushes CallQueuedListener jobs instead of running synchronously', async () => {
    SyncAudit.handled = [];
    QueuedNotify.handled = [];

    const queuedJobs: Job[] = [];
    const events = new EventRegistry();
    const listeners = new ListenerRegistry();

    const dispatcher = new EventDispatcher({
      eventRegistry: events,
      listenerRegistry: listeners,
      queue: {
        dispatch: async (job) => {
          queuedJobs.push(job);
        },
      },
      queueDefaults: { connection: 'database', queue: 'events' },
    });

    dispatcher.listen(OrderPlaced, SyncAudit);
    dispatcher.listen(OrderPlaced, QueuedNotify);

    await dispatcher.dispatch(new OrderPlaced({ orderId: 'ord_1' }));

    expect(SyncAudit.handled).toEqual(['ord_1']);
    expect(QueuedNotify.handled).toEqual([]);
    expect(queuedJobs).toHaveLength(1);
    expect(queuedJobs[0]?.jobName()).toBe('CallQueuedListener');
    expect(queuedJobs[0]?.data).toMatchObject({
      listener: 'QueuedNotify',
      event: 'OrderPlaced',
      eventData: { orderId: 'ord_1' },
    });
  });

  it('throws when a queued listener is used without a queue bridge', async () => {
    const dispatcher = new EventDispatcher();
    dispatcher.listen(OrderPlaced, QueuedNotify);

    await expect(dispatcher.dispatch(new OrderPlaced({ orderId: 'x' }))).rejects.toThrow(
      /queue bridge/i,
    );
  });
});