import { describe, expect, it } from 'vitest';
import { Application, HttpKernel, Route, setRouteApplication } from '@pondoknusa/core';
import { Response } from '@pondoknusa/http';
import { TestCase, withPondoknusaTest, wireFacades } from './index.js';

class HomeTest extends TestCase {
  protected createApplication(): Application {
    return new Application('/tmp/pondoknusa-testing');
  }

  protected override async configureApplication(app: Application): Promise<void> {
    setRouteApplication(app);
    Route.get('/health', () => Response.json({ ok: true }));
  }
}

describe('HttpTestClient', () => {
  it('dispatches through kernel with assertions', async () => {
    const app = new Application();
    setRouteApplication(app);
    Route.get('/ping', () => Response.json({ pong: true }));

    const kernel = new HttpKernel(app);
    const client = new (await import('./http-test-client.js')).HttpTestClient(kernel);

    const response = await client.get('http://localhost/ping');
    await response.assertOk().assertJson({ pong: true });
  });
});

describe('withPondoknusaTest', () => {
  const t = withPondoknusaTest(HomeTest);

  it('boots TestCase per example', async () => {
    const response = await t.http.get('http://localhost/health');
    await response.assertJson({ ok: true });
  });
});