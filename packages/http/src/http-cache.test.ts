import { describe, expect, it } from 'vitest';
import { PondoknusaRequest } from './request.js';
import { createHttpCacheMiddleware } from './http-cache.js';
import { Response } from './response.js';

describe('createHttpCacheMiddleware', () => {
  it('returns 304 when etag matches', async () => {
    const middleware = createHttpCacheMiddleware({
      maxAge: 120,
      etag: async () => 'stable-etag',
    });
    const request = new PondoknusaRequest(
      new Request('http://localhost/posts', {
        headers: { 'if-none-match': '"stable-etag"' },
      }),
    );

    const response = await middleware(request, async () => Response.json({ ok: true }));

    expect(response.status).toBe(304);
    expect(response.headers.get('cache-control')).toBe('private, max-age=120');
  });

  it('adds cache headers to fresh GET responses', async () => {
    const middleware = createHttpCacheMiddleware({ maxAge: 30, privacy: 'public' });
    const request = new PondoknusaRequest(new Request('http://localhost/posts'));

    const response = await middleware(request, async () => Response.json({ ok: true }));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('public, max-age=30');
    expect(response.headers.get('etag')).toBeTruthy();
  });
});