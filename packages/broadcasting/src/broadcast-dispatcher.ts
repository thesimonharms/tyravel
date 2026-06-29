import type { Event } from '@pondoknusa/events';
import type { Job } from '@pondoknusa/queue';
import { BroadcastEvent } from './broadcast-event.js';
import type { BroadcastManager } from './broadcast-manager.js';
import { buildBroadcastPayload, eventShouldBroadcast } from './should-broadcast.js';
import type { ShouldBroadcast } from './types.js';

export interface BroadcastQueueBridge {
  dispatch(
    job: Job,
    options: { connection?: string; queue?: string; delaySeconds?: number },
  ): Promise<void>;
}

export interface BroadcastDispatcherOptions {
  manager: BroadcastManager;
  queue?: BroadcastQueueBridge;
  queueDefaults?: {
    connection?: string;
    queue?: string;
  };
}

export class BroadcastDispatcher {
  private queueDefaults: BroadcastDispatcherOptions['queueDefaults'];

  constructor(private readonly options: BroadcastDispatcherOptions) {
    this.queueDefaults = options.queueDefaults;
  }

  setQueueDefaults(defaults: BroadcastDispatcherOptions['queueDefaults']): this {
    this.queueDefaults = {
      ...this.queueDefaults,
      ...defaults,
    };
    return this;
  }

  async dispatch(event: Event): Promise<void> {
    if (!eventShouldBroadcast(event)) {
      return;
    }

    const broadcastable = event as Event & ShouldBroadcast;
    const payload = buildBroadcastPayload(broadcastable);
    const connection = broadcastable.broadcastConnection?.()
      ?? this.options.manager.getDefaultConnection();

    if (this.options.queue) {
      const job = new BroadcastEvent({ connection, payload });
      await this.options.queue.dispatch(job, {
        connection: this.queueDefaults?.connection ?? 'database',
        queue: broadcastable.broadcastQueue?.() ?? this.queueDefaults?.queue ?? 'default',
      });
      return;
    }

    await this.options.manager.connection(connection).broadcast(payload);
  }
}