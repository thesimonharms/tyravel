import { describe, expect, it } from 'vitest';
import { Application, HttpKernel, Route, setRouteApplication } from '@pondoknusa/core';
import { Response } from '@pondoknusa/http';
import { createTestingMiddleware } from './test-request-context.js';
import { HttpTestClient } from './http-test-client.js';

describe('HttpTestClient sugar', () => {
  it('supports actingAs, withSession, and withCsrf', async () => {
    const app = new Application();
    setRouteApplication(app);
    app.use(createTestingMiddleware());

    Route.post('/profile', async (request) => Response.json({
      user: request.user,
      csrf: request.session?.get('_csrf_token'),
    }));

    const client = new HttpTestClient(new HttpKernel(app));
    const response = await client
      .actingAs({ id: 7, name: 'Ada' })
      .withSession({ theme: 'dark' })
      .withCsrf('csrf-123')
      .post('http://localhost/profile', { json: { ok: true } });

    await response.assertJson({
      user: { id: 7, name: 'Ada' },
      csrf: 'csrf-123',
    });
  });
});