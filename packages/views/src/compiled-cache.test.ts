import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  clearCompiledCacheDir,
  discoverViewNames,
} from './compiled-cache.js';
import { ViewEngine } from './view-engine.js';

describe('compiled cache', () => {
  it('discovers nested view names', async () => {
    const basePath = join(tmpdir(), `tyravel-views-discover-${Date.now()}`);
    const viewsPath = join(basePath, 'resources/views');
    mkdirSync(join(viewsPath, 'posts'), { recursive: true });
    writeFileSync(join(viewsPath, 'welcome.tyr'), '<p>Hi</p>');
    writeFileSync(join(viewsPath, 'posts/show.tyr'), '<p>Post</p>');

    await expect(discoverViewNames(viewsPath, '.tyr')).resolves.toEqual(['posts.show', 'welcome']);
  });

  it('warms and clears compiled cache files', async () => {
    const basePath = join(tmpdir(), `tyravel-views-cache-${Date.now()}`);
    const viewsPath = join(basePath, 'resources/views');
    const cachePath = join(basePath, 'storage/framework/views');
    mkdirSync(viewsPath, { recursive: true });
    writeFileSync(join(viewsPath, 'cached.tyr'), '<p>{{ message }}</p>');

    const engine = new ViewEngine(basePath, {
      path: 'resources/views',
      extension: '.tyr',
      compiled: true,
      compiledPath: 'storage/framework/views',
    });

    const warmed = await engine.warmCompiledCache();
    expect(warmed).toBe(1);

    const html = await engine.render('cached', { message: 'Hello' });
    expect(html).toContain('Hello');

    const cleared = await engine.clearCompiledCache();
    expect(cleared).toBeGreaterThan(0);
    await expect(clearCompiledCacheDir(cachePath)).resolves.toBe(0);
  });
});