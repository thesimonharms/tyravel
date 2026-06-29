import { describe, expect, it } from 'vitest';
import { PondoknusaRequest } from './request.js';
import { createThrottleMiddleware, resetThrottleStore } from './throttle.js';

describe('createThrottleMiddleware', () => {
  it('limits requests within the configured window', async () => {
    resetThrottleStore();
    const middleware = createThrottleMiddleware({
      limit: 2,
      windowMs: 60_000,
      key: () => 'test-key',
    });
    const request = new PondoknusaRequest(new Request('http://localhost/users'));

    const ok = await middleware(request, async () => new Response('ok'));
    expect(ok.status).toBe(200);

    const okAgain = await middleware(request, async () => new Response('ok'));
    expect(okAgain.status).toBe(200);

    const limited = await middleware(request, async () => new Response('ok'));
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBeTruthy();
  });
});