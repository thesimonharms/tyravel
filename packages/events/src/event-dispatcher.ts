import type { Constructor } from '@pondoknusa/container';
import type { Container } from '@pondoknusa/container';
import type { EventRegistry } from './event-registry.js';
import type { ListenerRegistry } from './listener-registry.js';
import type { EventDispatcherOptions } from './dispatcher-options.js';
import type { Event } from './types.js';
import {
  type EventConstructor,
  type ListenerCallback,
  type ListenerConstructor,
  type ListenerContract,
  type ListenerHandler,
} from './types.js';
import {
  buildCallQueuedListenerJob,
  listenerShouldQueue,
} from './should-queue.js';

export class EventDispatcher {
  private readonly listeners = new Map<string, ListenerHandler[]>();
  private readonly container?: Container;
  private readonly eventRegistry?: EventRegistry;
  private readonly listenerRegistry?: ListenerRegistry;
  private readonly queue?: EventDispatcherOptions['queue'];
  private queueDefaults: EventDispatcherOptions['queueDefaults'];
  private onDispatched?: EventDispatcherOptions['onDispatched'];

  constructor(options: EventDispatcherOptions = {}) {
    this.container = options.container;
    this.eventRegistry = options.eventRegistry;
    this.listenerRegistry = options.listenerRegistry;
    this.queue = options.queue;
    this.queueDefaults = options.queueDefaults;
    this.onDispatched = options.onDispatched;
  }

  listen<TEvent extends Event>(
    event: EventConstructor<TEvent>,
    handler: ListenerHandler<TEvent>,
  ): this {
    this.eventRegistry?.register(event);
    if (this.isListenerClass(handler)) {
      this.listenerRegistry?.register(handler);
    }

    const key = event.name;
    const existing = this.listeners.get(key) ?? [];
    existing.push(handler as ListenerHandler);
    this.listeners.set(key, existing);
    return this;
  }

  listenMany(
    event: EventConstructor,
    handlers: ListenerHandler[],
  ): this {
    for (const handler of handlers) {
      this.listen(event, handler);
    }
    return this;
  }

  hasListeners(event: EventConstructor | Event): boolean {
    const key = typeof event === 'function' ? event.name : event.constructor.name;
    return (this.listeners.get(key)?.length ?? 0) > 0;
  }

  async dispatch<TEvent extends Event>(event: TEvent): Promise<void> {
    const key = event.constructor.name;
    const handlers = this.listeners.get(key) ?? [];

    for (const handler of handlers) {
      await this.invokeHandler(handler, event);
    }

    if (this.onDispatched) {
      await this.onDispatched(event);
    }
  }

  onAfterDispatch(callback: (event: Event) => Promise<void>): this {
    this.onDispatched = callback;
    return this;
  }

  async dispatchUntil<TEvent extends Event>(
    event: TEvent,
    predicate: (event: TEvent) => boolean,
  ): Promise<boolean> {
    const key = event.constructor.name;
    const handlers = this.listeners.get(key) ?? [];

    for (const handler of handlers) {
      await this.invokeHandler(handler, event);
      if (predicate(event)) {
        return true;
      }
    }

    return false;
  }

  forget(event: EventConstructor): this {
    this.listeners.delete(event.name);
    return this;
  }

  flush(): this {
    this.listeners.clear();
    return this;
  }

  setQueueDefaults(defaults: EventDispatcherOptions['queueDefaults']): this {
    this.queueDefaults = {
      ...this.queueDefaults,
      ...defaults,
    };
    return this;
  }

  private async invokeHandler<TEvent extends Event>(
    handler: ListenerHandler<TEvent>,
    event: TEvent,
  ): Promise<void> {
    if (this.isListenerClass(handler) && listenerShouldQueue(handler)) {
      await this.queueListener(handler, event);
      return;
    }

    if (this.isListenerCallback(handler)) {
      await handler(event);
      return;
    }

    const instance = this.resolveListener(handler);
    await instance.handle(event);
  }

  private async queueListener<TEvent extends Event>(
    constructor: import('./should-queue.js').QueuedListenerConstructor,
    event: TEvent,
  ): Promise<void> {
    if (!this.queue) {
      throw new Error(
        `Listener ${constructor.name} is queued but no queue bridge is configured. Register QueueServiceProvider before EventServiceProvider.`,
      );
    }

    const { job, metadata } = buildCallQueuedListenerJob(
      constructor,
      event,
      this.queueDefaults,
    );

    await this.queue.dispatch(job, metadata);
  }

  private resolveListener<TEvent extends Event>(
    constructor: ListenerHandler<TEvent>,
  ): ListenerContract<TEvent> {
    if (this.container && this.isListenerClass(constructor)) {
      return this.container.make(
        constructor as Constructor<ListenerContract<TEvent>>,
      );
    }

    if (this.isListenerClass(constructor)) {
      return new (constructor as ListenerConstructor<TEvent>)();
    }

    throw new Error('Invalid event listener handler.');
  }

  private isListenerCallback<TEvent extends Event>(
    handler: ListenerHandler<TEvent>,
  ): handler is ListenerCallback<TEvent> {
    return (
      typeof handler === 'function' &&
      (!('prototype' in handler) || typeof handler.prototype?.handle !== 'function')
    );
  }

  private isListenerClass<TEvent extends Event>(
    handler: ListenerHandler<TEvent>,
  ): handler is ListenerConstructor<TEvent> {
    return (
      typeof handler === 'function' &&
      typeof handler.prototype?.handle === 'function'
    );
  }
}