import { describe, expect, it } from 'vitest';
import { resolveEchoClientConfig } from './echo-client-config.js';

describe('resolveEchoClientConfig', () => {
  it('returns null for log and null drivers', () => {
    expect(
      resolveEchoClientConfig(
        { default: 'log', connections: { log: { driver: 'log' } } },
        'http://127.0.0.1:3000',
      ),
    ).toBeNull();

    expect(
      resolveEchoClientConfig(
        { default: 'null', connections: { null: { driver: 'null' } } },
        'http://127.0.0.1:3000',
      ),
    ).toBeNull();
  });

  it('exposes websocket host and path without secrets', () => {
    expect(
      resolveEchoClientConfig(
        {
          default: 'websocket',
          connections: {
            websocket: {
              driver: 'websocket',
              redisConnection: 'default',
              path: '/pondoknusa/ws',
            },
          },
        },
        'http://127.0.0.1:3000/',
      ),
    ).toEqual({
      broadcaster: 'websocket',
      host: 'http://127.0.0.1:3000',
      path: '/pondoknusa/ws',
      authEndpoint: '/broadcasting/auth',
    });
  });
});