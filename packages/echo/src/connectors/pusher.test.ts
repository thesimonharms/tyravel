import { describe, expect, it } from 'vitest';
import { PusherConnector, type PusherChannelLike, type PusherLike } from './pusher.js';

describe('PusherConnector', () => {
  it('subscribes to channels and binds events', async () => {
    const bindings = new Map<string, Set<(payload: unknown) => void>>();
    const channels = new Map<string, PusherChannelLike>();

    const client: PusherLike = {
      connection: { socket_id: 'socket-42' },
      subscribe(channelName) {
        const channel: PusherChannelLike = {
          bind(event, listener) {
            const bucket = bindings.get(`${channelName}:${event}`) ?? new Set();
            bucket.add(listener);
            bindings.set(`${channelName}:${event}`, bucket);
          },
          unbind(event, listener) {
            const key = `${channelName}:${event}`;
            const bucket = bindings.get(key);
            if (!bucket) {
              return;
            }
            if (listener) {
              bucket.delete(listener);
              return;
            }
            bindings.delete(key);
          },
          unsubscribe() {
            channels.delete(channelName);
          },
        };
        channels.set(channelName, channel);
        return channel;
      },
      disconnect() {
        channels.clear();
      },
    };

    const connector = new PusherConnector({
      key: 'app-key',
      pusher: () => client,
      authTransport: {
        authorize: async () => ({ auth: 'signed' }),
      },
    });

    await connector.subscribe('private-orders.1');
    const payloads: unknown[] = [];
    connector.listen('private-orders.1', 'OrderShipped', (payload) => payloads.push(payload));

    for (const listener of bindings.get('private-orders.1:OrderShipped') ?? []) {
      listener({ id: 3 });
    }

    expect(payloads).toEqual([{ id: 3 }]);
  });
});