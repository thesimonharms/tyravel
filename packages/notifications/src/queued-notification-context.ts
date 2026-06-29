import type { Container } from '@pondoknusa/container';
import type { NotificationManager } from './notification-manager.js';
import type { NotificationRegistry } from './notification-registry.js';
import { SerializedNotifiable } from './serialized-notifiable.js';

export interface QueuedNotificationContext {
  manager: NotificationManager;
  registry: NotificationRegistry;
  SerializedNotifiable: typeof SerializedNotifiable;
  container?: Container;
}

let context: QueuedNotificationContext | undefined;

export function setQueuedNotificationContext(value: QueuedNotificationContext): void {
  context = value;
}

export function getQueuedNotificationContext(): QueuedNotificationContext {
  if (!context) {
    throw new Error('Queued notification context is not configured.');
  }
  return context;
}