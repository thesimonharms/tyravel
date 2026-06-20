import type { MailManager } from './mail-manager.js';

export interface QueuedMailContext {
  manager: MailManager;
}

let context: QueuedMailContext | undefined;

export function setQueuedMailContext(value: QueuedMailContext): void {
  context = value;
}

export function getQueuedMailContext(): QueuedMailContext {
  if (!context) {
    throw new Error('Queued mail context is not configured.');
  }
  return context;
}