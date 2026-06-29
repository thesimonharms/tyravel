import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from './compiler.js';
import { InMemoryComponentMemoCache, buildComponentMemoKey } from './component-memo-cache.js';
import { ViewEngine } from './view-engine.js';

describe('component memoization', () => {
  it('parses @memo and @@memo leading directives', () => {
    const withMemo = compile(`@memo
<div>{{ title }}</div>`);
    const withTtl = compile(`@@memo(120)
<span>Cached</span>`);

    expect(withMemo.memo).toBe(true);
    expect(withTtl.memo).toBe(120);
  });

  it('builds stable memo keys from props', () => {
    const left = buildComponentMemoKey('components.card', { title: 'Hi', count: 2 });
    const right = buildComponentMemoKey('components.card', { count: 2, title: 'Hi' });

    expect(left).toBe(right);
  });

  it('stores rendered component HTML in the memo cache', async () => {
    const basePath = join(tmpdir(), `pondoknusa-memo-${Date.now()}`);
    const viewsPath = join(basePath, 'resources/views');
    mkdirSync(join(viewsPath, 'components'), { recursive: true });

    writeFileSync(
      join(viewsPath, 'components/badge.tyr'),
      `@memo
<span class="badge">{{ label }}</span>`,
    );

    writeFileSync(
      join(viewsPath, 'page.tyr'),
      `@component('components.badge', { label: 'Hot' })
@component('components.badge', { label: 'Hot' })`,
    );

    const engine = new ViewEngine(basePath, { path: 'resources/views', compiled: false });
    const cache = new InMemoryComponentMemoCache();
    engine.getRegistry().setComponentMemoCache(cache);

    const html = await engine.render('page', {});
    expect(html).toContain('<span class="badge">Hot</span>');
    expect(cache.count()).toBe(1);

    await engine.render('page', {});
    expect(cache.count()).toBe(1);
  });
});