import type { Job } from '@pondoknusa/queue';
import { CallQueuedListener } from './call-queued-listener.js';
import type { Event } from './types.js';
import { Listener } from './types.js';
import type { ListenerConstructor } from './types.js';
import type { ShouldQueue } from './types.js';

export interface QueuedListenerMetadata {
  connection?: string;
  queue?: string;
  delaySeconds?: number;
}

export type QueuedListenerConstructor = ListenerConstructor & {
  shouldQueue: true;
} & QueuedListenerMetadata;

export abstract class QueuedListener<TEvent extends Event = Event>
  extends Listener<TEvent>
  implements ShouldQueue
{
  readonly shouldQueue = true as const;

  static shouldQueue = true as const;
  static connection?: string;
  static queue?: string;
  static delaySeconds?: number;
}

export function listenerShouldQueue(
  constructor: ListenerConstructor,
): constructor is QueuedListenerConstructor {
  const typed = constructor as ListenerConstructor & { shouldQueue?: boolean };
  return typed.shouldQueue === true;
}

export function resolveQueuedListenerMetadata(
  constructor: QueuedListenerConstructor,
  defaults: QueuedListenerMetadata & { connection?: string } = {},
): { connection: string; queue: string; delaySeconds: number } {
  return {
    connection: constructor.connection ?? defaults.connection ?? 'database',
    queue: constructor.queue ?? defaults.queue ?? 'default',
    delaySeconds: constructor.delaySeconds ?? defaults.delaySeconds ?? 0,
  };
}

export function buildCallQueuedListenerJob(
  constructor: QueuedListenerConstructor,
  event: Event,
  defaults: QueuedListenerMetadata & { connection?: string } = {},
): { job: Job; metadata: ReturnType<typeof resolveQueuedListenerMetadata> } {
  const metadata = resolveQueuedListenerMetadata(constructor, defaults);
  const job = new CallQueuedListener({
    listener: constructor.name,
    event: event.constructor.name,
    eventData: event.data as Record<string, unknown>,
  });

  return { job, metadata };
}