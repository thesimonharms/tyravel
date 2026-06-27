import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { compile } from './compiler.js';
import { ViewCompileError } from './view-compile-error.js';
import { InMemoryFragmentCache } from './fragment-cache.js';
import { CompiledViewCacheMissError } from './view-cache-error.js';
import { lintViewSource } from './view-lint.js';
import { ViewEngine } from './view-engine.js';
import { ViewPropsValidationError } from './component-props.js';

function createFixture(): { basePath: string; engine: ViewEngine } {
  const basePath = join(tmpdir(), `tyravel-p6-${Date.now()}-${Math.random()}`);
  const viewsPath = join(basePath, 'resources/views');
  mkdirSync(join(viewsPath, 'layouts'), { recursive: true });

  writeFileSync(
    join(viewsPath, 'layouts/app.tyr'),
    `<html><head>@stack('styles')</head><body>@yield('content')@stack('scripts')</body></html>`,
  );

  const engine = new ViewEngine(basePath, { path: 'resources/views' });
  return { basePath, engine };
}

describe('P6 view features', () => {
  const originalCi = process.env.CI;
  const originalStrict = process.env.TYRAVEL_VIEW_LINT_STRICT;

  afterEach(() => {
    if (originalCi === undefined) {
      delete process.env.CI;
    } else {
      process.env.CI = originalCi;
    }

    if (originalStrict === undefined) {
      delete process.env.TYRAVEL_VIEW_LINT_STRICT;
    } else {
      process.env.TYRAVEL_VIEW_LINT_STRICT = originalStrict;
    }
  });

  it('parses @pushOnce, @prepend, @inject, and @fragment directives', () => {
    const source = `@inject('stats', 'PostStats')
@pushOnce('scripts', 'app')
  <script src="/app.js"></script>
@endpushOnce
@prepend('styles')
  <link rel="stylesheet" href="/first.css" />
@endprepend
@fragment('sidebar', 60)
  <aside>Menu</aside>
@endfragment
`;

    const template = compile(source);

    expect(template.ops[0]).toMatchObject({
      type: 'inject',
      varName: 'stats',
      binding: 'PostStats',
    });
    expect(template.ops.some((op) => op.type === 'pushOnce' && op.name === 'scripts')).toBe(
      true,
    );
    expect(template.ops.some((op) => op.type === 'prepend' && op.name === 'styles')).toBe(
      true,
    );
    expect(template.ops.some((op) => op.type === 'fragment' && op.name === 'sidebar')).toBe(
      true,
    );
  });

  it('reports compile errors with view path and line numbers', () => {
    expect(() =>
      compile('@push(\'scripts\')\n  <script></script>\n', {
        viewPath: 'broken.tyr',
      }),
    ).toThrow(ViewCompileError);

    try {
      compile('@push(\'scripts\')\n  <script></script>\n', { viewPath: 'broken.tyr' });
    } catch (error) {
      expect(error).toBeInstanceOf(ViewCompileError);
      const compileError = error as ViewCompileError;
      expect(compileError.viewPath).toBe('broken.tyr');
      expect(compileError.line).toBe(1);
      expect(compileError.message).toContain('broken.tyr');
    }
  });

  it('renders @pushOnce only once and @prepend before other stack entries', async () => {
    const { basePath, engine } = createFixture();

    writeFileSync(
      join(basePath, 'resources/views/stack-advanced.tyr'),
      `@layout('layouts.app')
@section('content')
  <main>Body</main>
@endsection
@prepend('styles')
  <link rel="stylesheet" href="/first.css" />
@endprepend
@push('styles')
  <link rel="stylesheet" href="/second.css" />
@endpush
@pushOnce('scripts', 'app')
  <script src="/app.js"></script>
@endpushOnce
@pushOnce('scripts', 'app')
  <script src="/duplicate.js"></script>
@endpushOnce
`,
    );

    const html = await engine.render('stack-advanced', {});
    const stylesIndex = html.indexOf('/first.css');
    const secondStylesIndex = html.indexOf('/second.css');
    expect(stylesIndex).toBeGreaterThan(-1);
    expect(secondStylesIndex).toBeGreaterThan(stylesIndex);
    expect(html.match(/\/app\.js/g)?.length).toBe(1);
    expect(html).not.toContain('/duplicate.js');
  });

  it('resolves @inject bindings into view context', async () => {
    const { basePath, engine } = createFixture();

    engine.setInjector(async (binding) => {
      if (binding === 'PostStats') {
        return { total: 42 };
      }
      return null;
    });

    writeFileSync(
      join(basePath, 'resources/views/injected.tyr'),
      `@inject('stats', 'PostStats')
<p>Total: {{ stats.total }}</p>
`,
    );

    const html = await engine.render('injected', {});
    expect(html).toContain('Total: 42');
  });

  it('caches @fragment output with TTL', async () => {
    const { basePath, engine } = createFixture();
    const cache = new InMemoryFragmentCache();
    engine.getRegistry().setFragmentCache(cache);

    let calls = 0;
    engine.setInjector(() => {
      calls += 1;
      return { value: calls };
    });

    writeFileSync(
      join(basePath, 'resources/views/fragmented.tyr'),
      `@inject('stats', 'Counter')
@fragment('stats-box', 3600)
  <span>{{ stats.value }}</span>
@endfragment
@fragment('stats-box', 3600)
  <span>{{ stats.value }}</span>
@endfragment
`,
    );

    const html = await engine.render('fragmented', {});
    expect(html.match(/<span>1<\/span>/g)?.length).toBe(2);
    expect(calls).toBe(1);
  });

  it('scopes fragment cache per view path', async () => {
    const { basePath, engine } = createFixture();
    const cache = new InMemoryFragmentCache();
    engine.getRegistry().setFragmentCache(cache);

    writeFileSync(
      join(basePath, 'resources/views/frag-a.tyr'),
      `@fragment('box')
<span>{{ value }}</span>
@endfragment
`,
    );
    writeFileSync(
      join(basePath, 'resources/views/frag-b.tyr'),
      `@fragment('box')
<span>{{ value }}</span>
@endfragment
`,
    );

    const a = await engine.render('frag-a', { value: 'A' });
    const b = await engine.render('frag-b', { value: 'B' });

    expect(a).toContain('<span>A</span>');
    expect(b).toContain('<span>B</span>');
  });

  it('uses warm disk cache without reading source in production mode', async () => {
    const { basePath, engine } = createFixture();
    const cacheDir = join(basePath, 'storage/framework/views');
    mkdirSync(cacheDir, { recursive: true });

    writeFileSync(join(basePath, 'resources/views/cached.tyr'), '<p>{{ message }}</p>');

    const productionEngine = new ViewEngine(basePath, {
      path: 'resources/views',
      compiled: true,
      compiledPath: 'storage/framework/views',
      env: 'production',
    });
    productionEngine.setEnvironment('production');
    await productionEngine.warmCompiledCache();

    writeFileSync(join(basePath, 'resources/views/cached.tyr'), '<p>Changed</p>');

    const html = await productionEngine.render('cached', { message: 'Hello' });
    expect(html).toContain('Hello');
    expect(html).not.toContain('Changed');
  });

  it('lints unclosed directives, unknown components, and raw echoes', async () => {
    delete process.env.CI;
    delete process.env.TYRAVEL_VIEW_LINT_STRICT;

    const issues = await lintViewSource(
      `@push('scripts')
<script></script>
@component('missing.alert')
{!! userInput !!}
`,
      {
        viewPath: 'lint.tyr',
        componentExists: () => false,
      },
    );

    expect(issues.some((issue) => issue.rule === 'unclosed-directive')).toBe(true);
    expect(issues.some((issue) => issue.rule === 'unknown-component')).toBe(true);
    expect(issues.some((issue) => issue.rule === 'unsafe-raw-echo')).toBe(true);
    expect(issues.find((issue) => issue.rule === 'unsafe-raw-echo')?.severity).toBe(
      'warning',
    );
  });

  it('refuses to compile views at runtime when production cache is cold', async () => {
    const { basePath } = createFixture();
    const cacheDir = join(basePath, 'storage/framework/views');
    mkdirSync(cacheDir, { recursive: true });

    writeFileSync(join(basePath, 'resources/views/cold.tyr'), '<p>{{ message }}</p>');

    const productionEngine = new ViewEngine(basePath, {
      path: 'resources/views',
      compiled: true,
      compiledPath: 'storage/framework/views',
      env: 'production',
      requireCompiledCache: true,
    });
    productionEngine.setEnvironment('production');

    await expect(productionEngine.render('cold', { message: 'Hello' })).rejects.toThrow(
      CompiledViewCacheMissError,
    );
  });

  it('validates required @props during render', async () => {
    const { basePath, engine } = createFixture();

    writeFileSync(
      join(basePath, 'resources/views/props-required.tyr'),
      `@props(['title'])
<h1>{{ title }}</h1>
`,
    );

    await expect(engine.render('props-required', {})).rejects.toThrow(
      ViewPropsValidationError,
    );

    const html = await engine.render('props-required', { title: 'Hello' });
    expect(html).toContain('<h1>Hello</h1>');
  });
});