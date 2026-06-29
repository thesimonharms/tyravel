import { describe, expect, it } from 'vitest';
import { PondoknusaRequest } from '@pondoknusa/http';
import { Session } from './session.js';
import {
  createVerifyCsrfTokenMiddleware,
  VerifyCsrfTokenException,
} from './verify-csrf-token.js';

function requestWithSession(
  method: string,
  path: string,
  token?: string,
  body?: Record<string, string>,
): PondoknusaRequest {
  const request = new PondoknusaRequest(
    new Request(`http://localhost${path}`, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }),
  );
  const session = new Session('sess-1', token ? { _csrf_token: token } : {});
  request.session = session;
  return request;
}

describe('createVerifyCsrfTokenMiddleware', () => {
  it('skips safe methods', async () => {
    const middleware = createVerifyCsrfTokenMiddleware();
    const request = requestWithSession('GET', '/login', 'token-a');

    const response = await middleware(request, async () => new Response('ok'));
    expect(await response.text()).toBe('ok');
  });

  it('rejects POST without a matching token', async () => {
    const middleware = createVerifyCsrfTokenMiddleware();
    const request = requestWithSession('POST', '/login', 'token-a');

    await expect(middleware(request, async () => new Response('ok'))).rejects.toBeInstanceOf(
      VerifyCsrfTokenException,
    );
  });

  it('accepts a matching body token', async () => {
    const middleware = createVerifyCsrfTokenMiddleware();
    const request = requestWithSession('POST', '/login', 'token-a', { _token: 'token-a' });

    const response = await middleware(request, async () => new Response('ok'));
    expect(await response.text()).toBe('ok');
  });

  it('accepts a matching X-CSRF-TOKEN header', async () => {
    const middleware = createVerifyCsrfTokenMiddleware();
    const request = new PondoknusaRequest(
      new Request('http://localhost/login', {
        method: 'POST',
        headers: { 'X-CSRF-TOKEN': 'token-a' },
      }),
    );
    request.session = new Session('sess-1', { _csrf_token: 'token-a' });

    const response = await middleware(request, async () => new Response('ok'));
    expect(await response.text()).toBe('ok');
  });

  it('respects except patterns', async () => {
    const middleware = createVerifyCsrfTokenMiddleware({ except: ['/api/*'] });
    const request = requestWithSession('POST', '/api/posts');

    const response = await middleware(request, async () => new Response('ok'));
    expect(await response.text()).toBe('ok');
  });
});