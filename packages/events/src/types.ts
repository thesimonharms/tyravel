// eslint-disable-next-line @typescript-eslint/no-explicit-any
export abstract class Event<TData = any> {
  constructor(public readonly data: TData) {}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EventConstructor<TEvent extends Event = Event> = new (
  ...args: any[]
) => TEvent;

export type ListenerCallback<TEvent extends Event = Event> = (
  event: TEvent,
) => void | Promise<void>;

export interface ListenerContract<TEvent extends Event = Event> {
  handle(event: TEvent): void | Promise<void>;
}

export abstract class Listener<TEvent extends Event = Event>
  implements ListenerContract<TEvent>
{
  abstract handle(event: TEvent): void | Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ListenerConstructor<TEvent extends Event = Event> = new (
  ...args: any[]
) => ListenerContract<TEvent>;

export type ListenerHandler<TEvent extends Event = Event> =
  | ListenerConstructor<TEvent>
  | ListenerCallback<TEvent>;

export interface ShouldQueue {
  readonly shouldQueue: true;
}

export type EventListenerRegistration = [
  EventConstructor,
  ListenerHandler[],
];

export abstract class EventSubscriber {
  abstract subscribe(dispatcher: import('./event-dispatcher.js').EventDispatcher): void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EventSubscriberConstructor = new (...args: any[]) => EventSubscriber;

export interface EventsConfig {
  listen: EventListenerRegistration[];
  subscribers?: EventSubscriberConstructor[];
  queueConnection?: string;
  queue?: string;
}