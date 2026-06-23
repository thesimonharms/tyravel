import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { lintViewSource } from './view-lint.js';
import { ViewEngine } from './view-engine.js';

function createFixture(): { basePath: string; engine: ViewEngine } {
  const basePath = join(tmpdir(), `tyravel-polish-${Date.now()}-${Math.random()}`);
  mkdirSync(join(basePath, 'resources/views'), { recursive: true });
  const engine = new ViewEngine(basePath, { path: 'resources/views' });
  return { basePath, engine };
}

describe('Tier 6 polish', () => {
  it('scopes fragment cache keys per view', async () => {
    const { basePath, engine } = createFixture();

    writeFileSync(
      join(basePath, 'resources/views/a.tyr'),
      `@fragment('shared')
<p>{{ label }}</p>
@endfragment
`,
    );
    writeFileSync(
      join(basePath, 'resources/views/b.tyr'),
      `@fragment('shared')
<p>{{ label }}</p>
@endfragment
`,
    );

    const htmlA = await engine.render('a', { label: 'A' });
    const htmlB = await engine.render('b', { label: 'B' });

    expect(htmlA).toContain('<p>A</p>');
    expect(htmlB).toContain('<p>B</p>');
  });

  it('only streams sections rendered in the shell', async () => {
    const { basePath, engine } = createFixture();

    writeFileSync(
      join(basePath, 'resources/views/conditional-stream.tyr'),
      `@if (showSidebar)
  @stream('sidebar')
    <aside>Visible</aside>
  @endstream
@endif
<main>Core</main>
`,
    );

    const hidden: string[] = [];
    for await (const chunk of engine.renderStream('conditional-stream', { showSidebar: false })) {
      hidden.push(chunk);
    }
    expect(hidden.join('')).not.toContain('Visible');

    const shown: string[] = [];
    for await (const chunk of engine.renderStream('conditional-stream', { showSidebar: true })) {
      shown.push(chunk);
    }
    expect(shown.join('')).toContain('<aside>Visible</aside>');
  });

  it('replaces duplicate hydration island ids in the manifest', async () => {
    const { basePath, engine } = createFixture();

    writeFileSync(
      join(basePath, 'resources/views/islands.tyr'),
      `@island('counter', { n: 1 })
  <span>one</span>
@endisland
@island('counter', { n: 2 })
  <span>two</span>
@endisland
`,
    );

    await engine.render('islands', {});
    const manifest = engine.getHydrationManifest();

    expect(manifest.islands).toHaveLength(1);
    expect(manifest.islands[0]?.props).toEqual({ n: 2 });
  });

  it('lints duplicate islands and unknown escape contexts', async () => {
    const issues = await lintViewSource(
      `@island('dup')
@endisland
@island('dup')
@endisland
@escape('unknown', value)
`,
      { escapeContexts: new Set(['html', 'js']) },
    );

    expect(issues.some((issue) => issue.rule === 'duplicate-island')).toBe(true);
    expect(issues.some((issue) => issue.rule === 'unknown-escape-context')).toBe(true);
  });

  it('allows coexisting .tyr metadata when a programmatic view exists', async () => {
    const { basePath, engine } = createFixture();

    writeFileSync(
      join(basePath, 'resources/views/hybrid.tyr'),
      `@props(['title'])
<h1>{{ title }}</h1>
`,
    );
    writeFileSync(
      join(basePath, 'resources/views/hybrid.tyr.ts'),
      `export function render(ctx: Record<string, unknown>) {
  return '<p>' + String(ctx.message ?? '') + '</p>';
}
`,
    );

    const html = await engine.render('hybrid', { message: 'Programmatic wins' });
    expect(html).toBe('<p>Programmatic wins</p>');
    expect((await engine.getCompiledTemplate('hybrid')).props).toEqual({ title: undefined });
  });
});