import type { Container } from '@pondoknusa/container';
import type { EventDispatcher } from './event-dispatcher.js';
import type { EventSubscriber } from './types.js';
import type { EventSubscriberConstructor } from './types.js';
import type { EventsConfig } from './types.js';

export function registerEventListeners(
  dispatcher: EventDispatcher,
  registrations: EventsConfig['listen'],
): void {
  for (const [event, handlers] of registrations) {
    dispatcher.listenMany(event, handlers);
  }
}

export function registerEventSubscribers(
  dispatcher: EventDispatcher,
  subscribers: EventSubscriberConstructor[],
  container?: Container,
): void {
  for (const SubscriberClass of subscribers) {
    const instance = container
      ? container.make(
          SubscriberClass as import('@pondoknusa/container').Constructor<EventSubscriber>,
        )
      : new SubscriberClass();
    instance.subscribe(dispatcher);
  }
}

export function registerEventsConfig(
  dispatcher: EventDispatcher,
  config: EventsConfig,
  container?: Container,
): void {
  registerEventListeners(dispatcher, config.listen);
  if (config.subscribers?.length) {
    registerEventSubscribers(dispatcher, config.subscribers, container);
  }
}