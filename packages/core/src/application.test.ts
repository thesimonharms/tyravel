import { describe, expect, it } from 'vitest';
import { Response } from '@pondoknusa/http';
import { Application } from './application.js';
import { HttpKernel } from './http-kernel.js';
import { Route, setRouteApplication } from './route.js';
import { ServiceProvider } from './service-provider.js';

class AppServiceProvider extends ServiceProvider {
  override register() {
    this.app.instance('greeting', 'Hello from Pondoknusa');
  }
}

describe('Application', () => {
  it('boots providers and resolves the router', async () => {
    const app = new Application();
    app.register(AppServiceProvider);

    await app.boot();

    expect(app.make<string>('greeting')).toBe('Hello from Pondoknusa');
    expect(app.router()).toBe(app.router());
  });

  it('dispatches requests through the kernel and route facade', async () => {
    const app = new Application();
    setRouteApplication(app);

    Route.get('/', () => Response.json({ ok: true }));

    const kernel = new HttpKernel(app);
    const response = await kernel.handle(new Request('http://localhost/'));

    expect(await response.json()).toEqual({ ok: true });
  });
});