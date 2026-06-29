import { describe, expect, it } from 'vitest';
import { Router } from '@pondoknusa/http';
import { registerDebugRoutes } from './register-routes.js';
import { DebugStore } from './store.js';

describe('registerDebugRoutes', () => {
  it('returns a single entry when correlation query is set', async () => {
    const store = new DebugStore(10);
    const router = new Router();

    store.push({
      id: 'req-1',
      method: 'GET',
      path: '/posts',
      status: 200,
      durationMs: 4,
      timestamp: Date.now(),
      timeline: [],
      queries: [],
      warnings: [],
    });

    registerDebugRoutes(router, store, { path: '/__debug' });

    const dispatch = router.dispatch({
      method: 'GET',
      url: new URL('http://localhost/__debug?correlation=req-1'),
      headers: new Headers(),
    } as import('@pondoknusa/http').PondoknusaRequest);

    const response = await dispatch;
    expect(response.status).toBe(200);
    const body = await response.json() as { id: string };
    expect(body.id).toBe('req-1');
  });
});