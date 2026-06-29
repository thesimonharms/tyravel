import { describe, expect, it, vi } from 'vitest';
import { ConfigRepository } from '@pondoknusa/config';
import { Event, Listener } from '@pondoknusa/events';
import { Application } from './application.js';
import { EventServiceProvider } from './events-service-provider.js';

class SampleEvent extends Event<{ ok: boolean }> {}

class SampleListener extends Listener<SampleEvent> {
  static count = 0;

  override async handle(): Promise<void> {
    SampleListener.count += 1;
  }
}

describe('EventServiceProvider', () => {
  it('loads listener mappings from config during boot', async () => {
    SampleListener.count = 0;

    const app = new Application('/tmp/pondoknusa-events-test');
    const config = new ConfigRepository({
      events: {
        listen: [[SampleEvent, [SampleListener]]],
      },
    });

    app.instance('config', config);
    app.register(EventServiceProvider);
    await app.boot();

    await app.make<import('@pondoknusa/events').EventDispatcher>('events').dispatch(
      new SampleEvent({ ok: true }),
    );

    expect(SampleListener.count).toBe(1);
  });
});