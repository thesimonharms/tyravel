import type { Job } from '@pondoknusa/queue';
import type { EventRegistry } from './event-registry.js';
import type { ListenerRegistry } from './listener-registry.js';
import type { QueuedListenerMetadata } from './should-queue.js';

export interface QueuedListenerBridge {
  dispatch(
    job: Job,
    options: { connection: string; queue: string; delaySeconds: number },
  ): Promise<void>;
}

import type { Event } from './types.js';

export interface EventDispatcherOptions {
  container?: import('@pondoknusa/container').Container;
  eventRegistry?: EventRegistry;
  listenerRegistry?: ListenerRegistry;
  queue?: QueuedListenerBridge;
  queueDefaults?: QueuedListenerMetadata & { connection?: string };
  onDispatched?: (event: Event) => Promise<void>;
}