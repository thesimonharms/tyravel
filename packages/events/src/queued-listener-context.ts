import type { Container } from '@pondoknusa/container';
import type { EventRegistry } from './event-registry.js';
import type { ListenerRegistry } from './listener-registry.js';

export interface QueuedListenerContext {
  container?: Container;
  events: EventRegistry;
  listeners: ListenerRegistry;
}

let activeContext: QueuedListenerContext | undefined;

export function setQueuedListenerContext(context: QueuedListenerContext): void {
  activeContext = context;
}

export function getQueuedListenerContext(): QueuedListenerContext {
  if (!activeContext) {
    throw new Error(
      'Queued listener context is not configured. Register EventServiceProvider before processing CallQueuedListener jobs.',
    );
  }
  return activeContext;
}

export function clearQueuedListenerContext(): void {
  activeContext = undefined;
}