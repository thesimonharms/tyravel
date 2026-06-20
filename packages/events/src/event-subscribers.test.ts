import { describe, expect, it } from 'vitest';
import { Container } from '@tyravel/container';
import { EventDispatcher } from './event-dispatcher.js';
import { Event, Listener } from './types.js';
import { EventSubscriber } from './types.js';
import { registerEventSubscribers } from './subscribers.js';

class UserSignedUp extends Event<{ userId: number }> {}

class LogSignup extends Listener<UserSignedUp> {
  static calls: number[] = [];

  override async handle(event: UserSignedUp): Promise<void> {
    LogSignup.calls.push(event.data.userId);
  }
}

class AuthEventSubscriber extends EventSubscriber {
  subscribe(dispatcher: EventDispatcher): void {
    dispatcher.listen(UserSignedUp, LogSignup);
  }
}

describe('event subscribers', () => {
  it('registers listeners via subscribe()', async () => {
    LogSignup.calls = [];
    const dispatcher = new EventDispatcher();
    registerEventSubscribers(dispatcher, [AuthEventSubscriber]);

    await dispatcher.dispatch(new UserSignedUp({ userId: 42 }));
    expect(LogSignup.calls).toEqual([42]);
  });

  it('resolves subscriber from the container when provided', async () => {
    LogSignup.calls = [];
    const container = new Container();
    container.singleton(AuthEventSubscriber, () => new AuthEventSubscriber());

    const dispatcher = new EventDispatcher({ container });
    registerEventSubscribers(dispatcher, [AuthEventSubscriber], container);

    await dispatcher.dispatch(new UserSignedUp({ userId: 7 }));
    expect(LogSignup.calls).toEqual([7]);
  });
});