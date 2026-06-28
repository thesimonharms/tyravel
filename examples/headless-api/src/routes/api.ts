import { Route } from '@tyravel/core';
import { Response } from '@tyravel/http';

Route.get('/', () =>
  Response.json({
    mode: 'headless',
    message: 'Tyravel headless API example',
    docs: 'https://tyravel.dev/guide/headless',
    endpoints: {
      health: '/api/v1/health',
      login: 'POST /api/v1/login',
      me: 'GET /api/v1/me (Bearer token)',
      tokens: 'POST /api/v1/tokens (session auth)',
    },
  }),
);

Route.prefix('api/v1').middleware('throttle:api').group((routes) => {
  routes.get('/health', () => Response.json({ status: 'ok' }));
  routes.middleware('auth:api').get('/posts', () =>
    Response.json({
      data: [{ id: 1, title: 'Protected post (requires Bearer token)' }],
    }),
  );
});