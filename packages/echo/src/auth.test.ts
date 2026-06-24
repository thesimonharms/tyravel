import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAuthTransport } from './auth.js';

describe('createAuthTransport', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts socket and channel data to the auth endpoint', async () => {
    let capturedBody = '';
    let capturedHeaders = new Headers();

    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        capturedBody = String(init?.body ?? '');
        capturedHeaders = new Headers(init?.headers);
        return {
          ok: true,
          json: async () => ({ auth: 'signed' }),
        };
      }),
    );

    const transport = createAuthTransport({
      endpoint: '/broadcasting/auth',
      csrfToken: 'csrf-token',
    });

    const response = await transport.authorize('socket-1', 'private-orders.1', '{"id":1}');

    expect(response.auth).toBe('signed');
    expect(capturedHeaders.get('X-CSRF-TOKEN')).toBe('csrf-token');
    expect(JSON.parse(capturedBody)).toEqual({
      socket_id: 'socket-1',
      channel_name: 'private-orders.1',
      channel_data: '{"id":1}',
    });
  });
});