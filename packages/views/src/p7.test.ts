import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { compile } from './compiler.js';
import { buildComponentCatalog } from './component-catalog.js';
import { escapeJs, escapeUrl } from './escape.js';
import { ViewEngine } from './view-engine.js';
import type { ViewPropsMap } from './view-props.js';

declare module './view-props.js' {
  interface ViewPropsMap {
    'typed-welcome': { name: string };
  }
}

function createFixture(): { basePath: string; engine: ViewEngine } {
  const basePath = join(tmpdir(), `tyravel-p7-${Date.now()}-${Math.random()}`);
  const viewsPath = join(basePath, 'resources/views');
  mkdirSync(join(viewsPath, 'components'), { recursive: true });
  mkdirSync(join(viewsPath, 'layouts'), { recursive: true });

  const engine = new ViewEngine(basePath, { path: 'resources/views' });
  return { basePath, engine };
}

describe('P7 view features', () => {
  it('parses @escape, @stream, and @island directives', () => {
    const source = `@escape('js', payload)
@stream('sidebar')
  <aside>Menu</aside>
@endstream
@island('counter', { initial: 0 })
  <button>+</button>
@endisland
`;

    const template = compile(source);
    expect(template.ops.some((op) => op.type === 'escape')).toBe(true);
    expect(template.ops.some((op) => op.type === 'stream' && op.name === 'sidebar')).toBe(
      true,
    );
    expect(template.ops.some((op) => op.type === 'island' && op.id === 'counter')).toBe(
      true,
    );
  });

  it('supports typed render props via ViewPropsMap augmentation', async () => {
    const { basePath, engine } = createFixture();

    writeFileSync(
      join(basePath, 'resources/views/typed-welcome.tyr'),
      '<h1>Hello {{ name }}</h1>',
    );

    const props: ViewPropsMap['typed-welcome'] = { name: 'Ada' };
    const html = await engine.render('typed-welcome', props);
    expect(html).toContain('Hello Ada');
  });

  it('builds a component catalog with props and slots', () => {
    const { basePath } = createFixture();

    writeFileSync(
      join(basePath, 'resources/views/components/panel.tyr'),
      `@props(['title', 'count' => 0])
@slot('footer')
  <span>Default</span>
@endslot
<article>{{ title }}</article>
`,
    );

    const catalog = buildComponentCatalog(basePath, { path: 'resources/views' });
    const panel = catalog.find((entry) => entry.name === 'panel');

    expect(panel).toMatchObject({
      name: 'panel',
      props: { title: undefined, count: 0 },
      slots: ['footer'],
    });
  });

  it('renders custom escape contexts and built-in handlers', async () => {
    const { basePath, engine } = createFixture();

    engine.escape('url', escapeUrl);
    engine.escape('js', escapeJs);

    writeFileSync(
      join(basePath, 'resources/views/escaped.tyr'),
      `<a href="/search?q=@escape('url', query)"></a>
<script>const value = @escape('js', payload);</script>
`,
    );

    const html = await engine.render('escaped', {
      query: 'a&b',
      payload: { ok: true },
    });

    expect(html).toContain('a%26b');
    expect(html).toContain('{"ok":true}');
  });

  it('registers hydration islands and exposes a manifest', async () => {
    const { basePath, engine } = createFixture();

    writeFileSync(
      join(basePath, 'resources/views/islands.tyr'),
      `@island('counter', { initial: count })
  <button>{{ initial }}</button>
@endisland
`,
    );

    await engine.render('islands', { count: 3 });
    const manifest = engine.getHydrationManifest();

    expect(manifest.islands).toHaveLength(1);
    expect(manifest.islands[0]).toMatchObject({
      id: 'counter',
      props: { initial: 3 },
    });
    expect(manifest.islands[0]?.html).toContain('<button>3</button>');
  });

  it('streams layout shell before deferred sections', async () => {
    const { basePath, engine } = createFixture();

    writeFileSync(
      join(basePath, 'resources/views/layouts/stream.tyr'),
      `<html><head><title>App</title></head><body>@yield('content')</body></html>`,
    );

    writeFileSync(
      join(basePath, 'resources/views/streamed.tyr'),
      `@layout('layouts.stream')
@section('content')
  <main>Core</main>
  @stream('sidebar')
    <aside>Slow sidebar</aside>
  @endstream
@endsection
`,
    );

    const chunks: string[] = [];
    for await (const chunk of engine.renderStream('streamed', {})) {
      chunks.push(chunk);
    }

    expect(chunks[0]).toContain('<title>App</title>');
    expect(chunks[0]).toContain('<!--tyr-stream:sidebar-->');
    expect(chunks[0]).not.toContain('Slow sidebar');
    expect(chunks[1]).toContain('Slow sidebar');
  });

  it('renders programmatic .tyr.ts views', async () => {
    const { basePath, engine } = createFixture();

    writeFileSync(
      join(basePath, 'resources/views/programmatic.tyr.ts'),
      `export function render(ctx: Record<string, unknown>) {
  return '<p>' + String(ctx.message ?? '') + '</p>';
}
`,
    );

    const html = await engine.render('programmatic', { message: 'From TS' });
    expect(html).toBe('<p>From TS</p>');
    expect(engine.exists('programmatic')).toBe(true);
  });
});