import { ConfigRepository } from '@tyravel/config';
import {
  CallQueuedListener,
  EventDispatcher,
  EventRegistry,
  ListenerRegistry,
  registerEventsConfig,
  setQueuedListenerContext,
  type EventsConfig,
  type QueuedListenerBridge,
} from '@tyravel/events';
import { Dispatcher, JobRegistry, QueueManager } from '@tyravel/queue';
import { ServiceProvider } from './service-provider.js';

export class EventServiceProvider extends ServiceProvider {
  override register() {
    const eventRegistry = new EventRegistry();
    const listenerRegistry = new ListenerRegistry();
    const queueBridge = this.createQueueBridge();

    const dispatcher = new EventDispatcher({
      container: this.app,
      eventRegistry,
      listenerRegistry,
      queue: queueBridge,
    });

    this.app.instance('events.registry', eventRegistry);
    this.app.singleton(EventRegistry, () => eventRegistry);
    this.app.instance('events.listeners', listenerRegistry);
    this.app.singleton(ListenerRegistry, () => listenerRegistry);
    this.app.instance('events', dispatcher);
    this.app.singleton(EventDispatcher, () => dispatcher);

    setQueuedListenerContext({
      container: this.app,
      events: eventRegistry,
      listeners: listenerRegistry,
    });

    this.registerQueuedListenerJob();
  }

  override boot() {
    const config = this.app.make<ConfigRepository>('config');
    const eventsConfig = config.get<EventsConfig>('events', { listen: [] });
    const dispatcher = this.app.make<EventDispatcher>('events');

    dispatcher.setQueueDefaults({
      connection: eventsConfig.queueConnection,
      queue: eventsConfig.queue,
    });

    registerEventsConfig(dispatcher, eventsConfig, this.app);
  }

  private registerQueuedListenerJob(): void {
    try {
      const jobs = this.app.make<JobRegistry>('jobs.registry');
      jobs.register(CallQueuedListener);
    } catch {
      // Queue provider not registered.
    }
  }

  private createQueueBridge(): QueuedListenerBridge | undefined {
    try {
      const manager = this.app.make<QueueManager>('queue');
      return {
        dispatch: async (job, options) => {
          const connection = manager.connection(options.connection);
          const dispatcher = new Dispatcher(connection);

          const delaySeconds = options.delaySeconds ?? 0;
          if (delaySeconds > 0) {
            await dispatcher.dispatchLater(delaySeconds, job, options.queue);
            return;
          }

          await dispatcher.dispatch(job, options.queue);
        },
      };
    } catch {
      return undefined;
    }
  }
}