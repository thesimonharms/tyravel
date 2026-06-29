import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { Response } from '@pondoknusa/http';
import { Application } from './application.js';
import { bootstrapRouteCache } from './route-cache-bootstrap.js';
import { Route, setRouteApplication } from './route.js';

describe('bootstrapRouteCache', () => {
  let tempDir = '';
  let previousNodeEnv: string | undefined;

  afterEach(() => {
    process.env.NODE_ENV = previousNodeEnv;
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = '';
    }
  });

  it('warms the router when the manifest matches registered routes', async () => {
    previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    tempDir = mkdtempSync(join(tmpdir(), 'pondoknusa-route-cache-'));
    mkdirSync(join(tempDir, 'storage/framework'), { recursive: true });

    const app = new Application(tempDir);
    setRouteApplication(app);
    Route.get('/health', () => Response.json({ ok: true }));

    const manifest = app.router().warmRouteCache().exportRouteCache();
    writeFileSync(
      join(tempDir, 'storage/framework/routes.json'),
      JSON.stringify(manifest),
    );

    app.router().clearRouteCache();

    const result = await bootstrapRouteCache(app);
    expect(result.loaded).toBe(true);
    expect(result.routeCount).toBe(1);
  });

  it('skips loading outside production by default', async () => {
    previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    tempDir = mkdtempSync(join(tmpdir(), 'pondoknusa-route-cache-'));
    const app = new Application(tempDir);
    setRouteApplication(app);
    Route.get('/health', () => Response.json({ ok: true }));

    const result = await bootstrapRouteCache(app);
    expect(result.loaded).toBe(false);
  });
});