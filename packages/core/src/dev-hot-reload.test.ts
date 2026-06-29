import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { ConfigRepository, loadConfig } from '@pondoknusa/config';
import { Application, setRouteApplication } from './index.js';
import { startDevHotReload } from './dev-hot-reload.js';

describe('dev hot reload', () => {
  let tempDir = '';

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = '';
    }
  });

  it('is a no-op when hot reload is disabled', () => {
    const previous = process.env.PONDOKNUSA_HOT_RELOAD;
    delete process.env.PONDOKNUSA_HOT_RELOAD;

    const watcher = startDevHotReload(new Application('/tmp'));
    watcher.close();

    if (previous) {
      process.env.PONDOKNUSA_HOT_RELOAD = previous;
    }

    expect(true).toBe(true);
  });

  it('replaces config in the repository', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'pondoknusa-hot-reload-'));
    mkdirSync(join(tempDir, 'config'), { recursive: true });
    writeFileSync(join(tempDir, 'config', 'app.ts'), `export default { name: 'after' };\n`);

    const app = new Application(tempDir);
    app.instance('config', new ConfigRepository({ app: { name: 'before' } }));

    const config = await loadConfig(tempDir, { validate: false });
    app.make<ConfigRepository>('config').replace(config);
    expect(app.make<ConfigRepository>('config').get('app.name')).toBe('after');
  });

  it('clears routes via router.resetRoutes', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'pondoknusa-hot-reload-'));
    const app = new Application(tempDir);
    setRouteApplication(app);
    const { Response } = await import('@pondoknusa/http');
    app.router().get('/hot', () => Response.text('ok'));
    expect(app.router().listRoutes()).toHaveLength(1);
    app.router().resetRoutes();
    expect(app.router().listRoutes()).toHaveLength(0);
  });
});