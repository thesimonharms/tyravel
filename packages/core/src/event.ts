import type {
  Event,
  EventConstructor,
  EventDispatcher,
  ListenerHandler,
} from '@pondoknusa/events';
import type { Application } from './application.js';

let activeApp: Application | undefined;

export function setEventApplication(app: Application): void {
  activeApp = app;
}

function application(): Application {
  if (!activeApp) {
    throw new Error(
      'Events facade is not ready. Boot the application before dispatching events.',
    );
  }
  return activeApp;
}

function dispatcher(): EventDispatcher {
  return application().make<EventDispatcher>('events');
}

export interface EventsFacade {
  listen<TEvent extends Event>(
    event: EventConstructor<TEvent>,
    handler: ListenerHandler<TEvent>,
  ): EventDispatcher;
  dispatch<TEvent extends Event>(event: TEvent): Promise<void>;
  dispatchUntil<TEvent extends Event>(
    event: TEvent,
    predicate: (event: TEvent) => boolean,
  ): Promise<boolean>;
}

export const Events: EventsFacade = {
  listen: (event, handler) => dispatcher().listen(event, handler),
  dispatch: (event) => dispatcher().dispatch(event),
  dispatchUntil: (event, predicate) => dispatcher().dispatchUntil(event, predicate),
};

export async function fire<T extends Event>(instance: T): Promise<void> {
  return Events.dispatch(instance);
}