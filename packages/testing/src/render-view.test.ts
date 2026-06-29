import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { Application } from '@pondoknusa/core';
import { ViewServiceProvider } from '@pondoknusa/core';
import { ConfigServiceProvider } from '@pondoknusa/core';
import { renderView } from './render-view.js';
import { wireFacades } from './application-helpers.js';

describe('renderView', () => {
  it('renders views through a booted application', async () => {
    const basePath = join(tmpdir(), `pondoknusa-render-view-${Date.now()}`);
    const viewsPath = join(basePath, 'resources/views');
    mkdirSync(viewsPath, { recursive: true });
    mkdirSync(join(basePath, 'config'), { recursive: true });

    writeFileSync(join(viewsPath, 'dashboard.tyr'), '<main>Dashboard for {{ user }}</main>');
    writeFileSync(
      join(basePath, 'config/views.ts'),
      `export default { path: 'resources/views', extension: '.tyr' };`,
    );

    const app = new Application(basePath);
    app.register(ConfigServiceProvider);
    app.register(ViewServiceProvider);
    await app.boot();
    wireFacades(app);

    const view = await renderView(app, 'dashboard', { user: 'Ada' });
    view.assertSee('Dashboard for Ada');
  });
});