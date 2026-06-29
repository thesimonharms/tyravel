import { describe, expect, it } from 'vitest';
import { PondoknusaRequest } from './request.js';
import { createCorsMiddleware } from './cors.js';

describe('createCorsMiddleware', () => {
  it('adds cors headers to responses', async () => {
    const middleware = createCorsMiddleware({ origins: '*' });
    const request = new PondoknusaRequest(
      new Request('http://localhost/users', {
        headers: { origin: 'http://localhost:3000' },
      }),
    );

    const response = await middleware(request, async () => new Response('ok'));
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
  });

  it('handles preflight requests', async () => {
    const middleware = createCorsMiddleware({
      origins: ['http://localhost:3000'],
      credentials: true,
    });
    const request = new PondoknusaRequest(
      new Request('http://localhost/users', {
        method: 'OPTIONS',
        headers: { origin: 'http://localhost:3000' },
      }),
    );

    const response = await middleware(request, async () => new Response('fail'));
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  });
});