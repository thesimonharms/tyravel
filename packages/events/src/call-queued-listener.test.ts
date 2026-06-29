import { describe, expect, it } from 'vitest';
import { Container } from '@pondoknusa/container';
import { JobRegistry, QueueWorker } from '@pondoknusa/queue';
import {
  CallQueuedListener,
  Event,
  EventRegistry,
  ListenerRegistry,
  QueuedListener,
  setQueuedListenerContext,
} from './index.js';

class InvoicePaid extends Event<{ invoiceId: number }> {}

class RecordPayment extends QueuedListener<InvoicePaid> {
  static calls: number[] = [];

  override async handle(event: InvoicePaid): Promise<void> {
    RecordPayment.calls.push(event.data.invoiceId);
  }
}

describe('CallQueuedListener job', () => {
  it('rehydrates the event and invokes the listener when processed', async () => {
    RecordPayment.calls = [];

    const events = new EventRegistry();
    events.register(InvoicePaid);
    const listeners = new ListenerRegistry();
    listeners.register(RecordPayment);

    const container = new Container();
    setQueuedListenerContext({ container, events, listeners });

    const registry = new JobRegistry();
    registry.register(CallQueuedListener);

    const worker = new QueueWorker(registry, container);
    await worker.process({
      job: 'CallQueuedListener',
      data: {
        listener: 'RecordPayment',
        event: 'InvoicePaid',
        eventData: { invoiceId: 9001 },
      },
    });

    expect(RecordPayment.calls).toEqual([9001]);
  });
});