import { describe, expect, it, vi } from 'vitest';
import { Container } from '@pondoknusa/container';
import { EventDispatcher } from './event-dispatcher.js';
import { Event, Listener } from './types.js';

class UserRegistered extends Event<{ userId: number }> {}

class LogUserRegistered extends Listener<UserRegistered> {
  static calls: UserRegistered[] = [];

  override async handle(event: UserRegistered): Promise<void> {
    LogUserRegistered.calls.push(event);
  }
}

describe('EventDispatcher', () => {
  it('dispatches to class-based listeners', async () => {
    LogUserRegistered.calls = [];
    const dispatcher = new EventDispatcher();
    dispatcher.listen(UserRegistered, LogUserRegistered);

    const event = new UserRegistered({ userId: 42 });
    await dispatcher.dispatch(event);

    expect(LogUserRegistered.calls).toHaveLength(1);
    expect(LogUserRegistered.calls[0]?.data.userId).toBe(42);
  });

  it('dispatches to inline listener callbacks', async () => {
    const handler = vi.fn();
    const dispatcher = new EventDispatcher();
    dispatcher.listen(UserRegistered, handler);

    await dispatcher.dispatch(new UserRegistered({ userId: 7 }));

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]?.[0]?.data.userId).toBe(7);
  });

  it('resolves listeners from the container when available', async () => {
    class CounterListener extends Listener<UserRegistered> {
      constructor(public readonly label: string) {
        super();
      }

      override async handle(): Promise<void> {
        //
      }
    }

    const container = new Container();
    container.singleton(CounterListener, () => new CounterListener('from-container'));

    const dispatcher = new EventDispatcher({ container });
    dispatcher.listen(UserRegistered, CounterListener);

    const instance = container.make(CounterListener);
    const handleSpy = vi.spyOn(instance, 'handle');

    await dispatcher.dispatch(new UserRegistered({ userId: 1 }));

    expect(handleSpy).toHaveBeenCalledOnce();
  });

  it('stops early when dispatchUntil predicate matches', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const dispatcher = new EventDispatcher();
    dispatcher.listen(UserRegistered, first);
    dispatcher.listen(UserRegistered, second);

    const event = new UserRegistered({ userId: 99 });
    const stopped = await dispatcher.dispatchUntil(event, (e) => e.data.userId === 99);

    expect(stopped).toBe(true);
    expect(first).toHaveBeenCalledOnce();
    expect(second).not.toHaveBeenCalled();
  });
});