import { Job } from '@pondoknusa/queue';
import { getQueuedListenerContext } from './queued-listener-context.js';

export interface CallQueuedListenerData extends Record<string, unknown> {
  listener: string;
  event: string;
  eventData: Record<string, unknown>;
}

export class CallQueuedListener extends Job<CallQueuedListenerData> {
  override async handle(): Promise<void> {
    const context = getQueuedListenerContext();
    const event = context.events.create(this.data.event, this.data.eventData);
    const ListenerClass = context.listeners.resolve(this.data.listener);

    if (context.container) {
      const instance = context.container.make(
        ListenerClass as import('@pondoknusa/container').Constructor<
          import('./types.js').ListenerContract
        >,
      );
      await instance.handle(event);
      return;
    }

    const instance = context.listeners.create(this.data.listener);
    await instance.handle(event);
  }
}