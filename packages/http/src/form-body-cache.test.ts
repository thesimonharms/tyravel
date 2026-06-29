import { describe, expect, it } from 'vitest';
import { PondoknusaRequestPool } from './request-pool.js';
import { cachedFormData, createFormBodyCacheMiddleware } from './form-body-cache.js';

describe('createFormBodyCacheMiddleware', () => {
  it('parses form bodies from the raw request when instances are pooled', async () => {
    const middleware = createFormBodyCacheMiddleware();
    const pool = new PondoknusaRequestPool(4);

    const firstRequest = pool.acquire(
      new Request('http://localhost/register', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: '_token=token-a&email=a@example.com',
      }),
      {},
    );

    await middleware(firstRequest, async () => new Response('ok'));
    expect(cachedFormData(firstRequest)?.get('_token')).toBe('token-a');
    pool.release(firstRequest);

    const secondRequest = pool.acquire(
      new Request('http://localhost/register', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: '_token=token-b&email=b@example.com',
      }),
      {},
    );

    expect(secondRequest).toBe(firstRequest);
    await middleware(secondRequest, async () => new Response('ok'));
    expect(cachedFormData(secondRequest)?.get('_token')).toBe('token-b');
    expect(await secondRequest.input('_token')).toBe('token-b');
  });
});