import { describe, expect, it } from 'vitest';
import { Response } from '@pondoknusa/http';
import { Application } from './application.js';
import { HttpKernel } from './http-kernel.js';
import { Route, setRouteApplication } from './route.js';
import { ServiceProvider } from './service-provider.js';

class LazyMarkerProvider extends ServiceProvider {
  override register(): void {
    this.app.instance('lazy.marker', 'booted');
  }
}

describe('lazy service providers', () => {
  it('defers provider boot until a matching route is requested', async () => {
    const app = new Application();
    setRouteApplication(app);
    app.registerLazy(LazyMarkerProvider, { routePrefixes: ['/lazy'] });
    Route.get('/lazy', () => Response.json({ ok: true }));
    Route.get('/other', () => Response.json({ other: true }));

    await app.boot();
    expect(app.hasBootedLazyProvider(LazyMarkerProvider)).toBe(false);

    const kernel = new HttpKernel(app);
    await kernel.handle(new Request('http://localhost/other'));
    expect(app.hasBootedLazyProvider(LazyMarkerProvider)).toBe(false);

    const response = await kernel.handle(new Request('http://localhost/lazy'));
    expect(await response.json()).toEqual({ ok: true });
    expect(app.hasBootedLazyProvider(LazyMarkerProvider)).toBe(true);
    expect(app.make<string>('lazy.marker')).toBe('booted');
  });

  it('boots lazy providers for matching CLI commands', async () => {
    const app = new Application();
    app.registerLazy(LazyMarkerProvider, { commands: ['mcp:serve'] });

    await app.boot();
    await app.bootLazyProvidersForCommand('mcp:serve');

    expect(app.hasBootedLazyProvider(LazyMarkerProvider)).toBe(true);
  });

  it('boots lazy providers when bootWhen matches', async () => {
    const app = new Application();
    app.registerLazy(LazyMarkerProvider, {
      bootWhen: () => true,
    });
    Route.get('/', () => Response.text('ok'));

    await app.boot();
    const kernel = new HttpKernel(app);
    await kernel.handle(new Request('http://localhost/'));

    expect(app.hasBootedLazyProvider(LazyMarkerProvider)).toBe(true);
  });
});