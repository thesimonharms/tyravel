import { describe, expect, it } from 'vitest';
import { MethodNotAllowedException } from './http-exception.js';
import { withMiddlewareMeta } from './middleware-meta.js';
import { MiddlewareRegistry } from './middleware-registry.js';
import { Response } from './response.js';
import { RouteNotFoundException, Router } from './router.js';

describe('Router', () => {
  it('matches static routes', async () => {
    const router = new Router();

    router.get('/', () => Response.text('home'));

    const response = await router.dispatch(new Request('http://localhost/'));
    expect(await response.text()).toBe('home');
  });

  it('matches parameterized routes', async () => {
    const router = new Router();

    router.get('/users/:id', (request) =>
      Response.json({ id: request.param('id') }),
    );

    const response = await router.dispatch(
      new Request('http://localhost/users/42'),
    );

    expect(await response.json()).toEqual({ id: '42' });
  });

  it('runs middleware in order', async () => {
    const router = new Router();
    const order: string[] = [];

    router.use(async (_request, next) => {
      order.push('global');
      return next();
    });

    router.middleware(async (_request, next) => {
      order.push('route');
      return next();
    }).get('/ping', () => {
      order.push('handler');
      return Response.text('pong');
    });

    await router.dispatch(new Request('http://localhost/ping'));

    expect(order).toEqual(['global', 'route', 'handler']);
  });

  it('resolves named middleware aliases', async () => {
    const registry = new MiddlewareRegistry();
    const router = new Router(registry);
    const order: string[] = [];

    registry.alias('auth', async (_request, next) => {
      order.push('auth');
      return next();
    });

    router.middleware('auth').get('/secure', () => Response.text('ok'));

    await router.dispatch(new Request('http://localhost/secure'));

    expect(order).toEqual(['auth']);
  });

  it('accepts middleware arrays like middleware([\'csrf\', \'guest\'])', async () => {
    const registry = new MiddlewareRegistry();
    const router = new Router(registry);
    const order: string[] = [];

    registry.alias('csrf', async (_request, next) => {
      order.push('csrf');
      return next();
    });
    registry.alias('guest', async (_request, next) => {
      order.push('guest');
      return next();
    });

    router.middleware(['csrf', 'guest']).post('/register', () => {
      order.push('handler');
      return Response.text('ok');
    });

    await router.dispatch(
      new Request('http://localhost/register', { method: 'POST' }),
    );

    expect(order).toEqual(['csrf', 'guest', 'handler']);
  });

  it('applies route groups with prefix and middleware', async () => {
    const router = new Router();
    const order: string[] = [];

    router.prefix('api').middleware(async (_request, next) => {
      order.push('api');
      return next();
    }).group(() => {
      router.get('/users', () => {
        order.push('handler');
        return Response.text('ok');
      });
    });

    const response = await router.dispatch(new Request('http://localhost/api/users'));

    expect(await response.text()).toBe('ok');
    expect(order).toEqual(['api', 'handler']);
  });

  it('prefixes named routes inside groups', () => {
    const router = new Router();

    router.prefix('api').namePrefix('api.').group(() => {
      router.get('/users', () => Response.text('ok')).name('users.index');
    });

    expect(router.url('api.users.index')).toBe('/api/users');
  });

  it('generates urls for named routes', () => {
    const router = new Router();

    router.get('/posts/:slug', () => Response.text('ok')).name('posts.show');

    expect(router.url('posts.show', { slug: 'hello-world' })).toBe(
      '/posts/hello-world',
    );
  });

  it('applies url defaults when generating named routes', () => {
    const router = new Router();

    router.get('/:locale/posts/:slug', () => Response.text('ok')).name('posts.show');
    router.setUrlDefaults({ locale: 'en' });

    expect(router.url('posts.show', { slug: 'hello-world' })).toBe(
      '/en/posts/hello-world',
    );
  });

  it('throws when no route matches', async () => {
    const router = new Router();

    await expect(
      router.dispatch(new Request('http://localhost/missing')),
    ).rejects.toThrow(RouteNotFoundException);
  });

  it('short-circuits 404 when early404 is enabled', async () => {
    const router = new Router();
    router.setEarly404(true);

    const response = await router.dispatch(new Request('http://localhost/missing'));
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.status).toBe(404);
    expect(body.message).toContain('/missing');
  });

  it('throws MethodNotAllowedException when path matches but method does not', async () => {
    const router = new Router();

    router.get('/users', () => Response.text('ok'));
    router.post('/users', () => Response.text('created'));

    await expect(
      router.dispatch(new Request('http://localhost/users', { method: 'DELETE' })),
    ).rejects.toThrow(MethodNotAllowedException);
  });

  it('includes allowed methods in 405 error', async () => {
    const router = new Router();

    router.get('/users', () => Response.text('ok'));
    router.post('/users', () => Response.text('created'));

    try {
      await router.dispatch(new Request('http://localhost/users', { method: 'DELETE' }));
      expect.unreachable('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(MethodNotAllowedException);
      const e = error as MethodNotAllowedException;
      expect(e.status).toBe(405);
      expect(e.allowedMethods).toEqual(expect.arrayContaining(['GET', 'POST']));
      expect(e.headers.get('allow')).toContain('GET');
      expect(e.headers.get('allow')).toContain('POST');
    }
  });

  it('skips session middleware on JSON fast-path routes', async () => {
    const router = new Router();
    const order: string[] = [];

    router.use(
      withMiddlewareMeta(async (_request, next) => {
        order.push('session');
        return next();
      }, { tag: 'session' }),
    );

    router.get('/api/v1/health', () => {
      order.push('handler');
      return Response.json({ status: 'ok' });
    });

    await router.dispatch(new Request('http://localhost/api/v1/health'));

    expect(order).toEqual(['handler']);
  });

  it('reuses TyravelRequest instances when request pooling is enabled', async () => {
    const router = new Router();
    router.setRequestPooling(true);

    const seen: unknown[] = [];
    router.get('/pool', (request) => {
      seen.push(request);
      request.user = { warmed: true };
      return Response.json({ ok: true });
    });

    await router.dispatch(new Request('http://localhost/pool'));
    await router.dispatch(new Request('http://localhost/pool'));

    expect(seen).toHaveLength(2);
    expect(seen[0]).toBe(seen[1]);
    expect((seen[1] as { user: unknown }).user).toBeNull();
  });

  it('accepts a pre-parsed pathname to avoid duplicate URL parsing', async () => {
    const router = new Router();
    router.get('/api/health', () => Response.json({ ok: true }));

    const response = await router.dispatch(
      new Request('http://localhost/other'),
      '/api/health',
    );

    expect(await response.json()).toEqual({ ok: true });
  });

  it('matches static routes via the static lookup table', async () => {
    const router = new Router();
    router.get('/api/v1/health', () => Response.text('ok'));
    router.get('/users/:id', (request) => Response.json({ id: request.param('id') }));

    const health = await router.dispatch(new Request('http://localhost/api/v1/health'));
    const user = await router.dispatch(new Request('http://localhost/users/7'));

    expect(await health.text()).toBe('ok');
    expect(await user.json()).toEqual({ id: '7' });
  });

  it('memoizes compiled routes after the first dispatch', async () => {
    const router = new Router();
    router.get('/memo', () => Response.text('hit'));

    await router.dispatch(new Request('http://localhost/memo'));
    router.warmRouteCache();
    const before = router.exportRouteCache().routes.length;

    await router.dispatch(new Request('http://localhost/memo'));

    expect(before).toBe(1);
  });

  it('matches dynamic routes via the prefix trie for large route tables', async () => {
    const router = new Router();

    for (let i = 0; i < 120; i++) {
      router.get(`/api/v1/resources/${i}/:id`, () => Response.text(`resource-${i}`));
    }

    router.get('/api/v1/users/:id', (request) =>
      Response.json({ id: request.param('id') }),
    );
    router.get('/api/v1/users/:userId/posts/:postId', (request) =>
      Response.json({
        userId: request.param('userId'),
        postId: request.param('postId'),
      }),
    );

    const user = await router.dispatch(new Request('http://localhost/api/v1/users/42'));
    const nested = await router.dispatch(
      new Request('http://localhost/api/v1/users/42/posts/7'),
    );
    const resource = await router.dispatch(
      new Request('http://localhost/api/v1/resources/15/99'),
    );

    expect(await user.json()).toEqual({ id: '42' });
    expect(await nested.json()).toEqual({ userId: '42', postId: '7' });
    expect(await resource.text()).toBe('resource-15');
  });

  it('keeps session middleware on routes that require it', async () => {
    const registry = new MiddlewareRegistry();
    const router = new Router(registry);
    const order: string[] = [];

    registry.alias('guest', async (_request, next) => {
      order.push('guest');
      return next();
    });

    router.use(
      withMiddlewareMeta(async (_request, next) => {
        order.push('session');
        return next();
      }, { tag: 'session' }),
    );

    router.middleware('guest').get('/login', () => {
      order.push('handler');
      return Response.json({ ok: true });
    });

    await router.dispatch(new Request('http://localhost/login'));

    expect(order).toEqual(['session', 'guest', 'handler']);
  });
});