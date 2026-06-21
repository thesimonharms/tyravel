import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { ViewEngine } from './view-engine.js';

function createFixture(): { basePath: string; engine: ViewEngine } {
  const basePath = join(tmpdir(), `tyravel-views-${Date.now()}-${Math.random()}`);
  const viewsPath = join(basePath, 'resources/views');
  mkdirSync(join(viewsPath, 'layouts'), { recursive: true });
  mkdirSync(join(viewsPath, 'components'), { recursive: true });

  writeFileSync(
    join(viewsPath, 'layouts/app.tyr'),
    `<!DOCTYPE html>
<html>
<head><title>@yield('title', 'Tyravel')</title></head>
<body>
  @yield('content')
</body>
</html>
`,
  );

  writeFileSync(
    join(viewsPath, 'welcome.tyr'),
    `@layout('layouts.app')

@section('title')
  Welcome
@endsection

@section('content')
  <h1>Hello {{ name }}</h1>
  @if (showDetails)
    <p>Users: {{ users.length }}</p>
  @endif
  <ul>
  @foreach (users as user)
    <li>{{ user }}</li>
  @endforeach
  </ul>
  @component('components.alert', { message: greeting })
@endsection
`,
  );

  writeFileSync(
    join(viewsPath, 'components/alert.tyr'),
    `<div class="alert">{{ message }}</div>`,
  );

  writeFileSync(
    join(viewsPath, 'components/card.tyr'),
    `<article class="card">
  <header>{{ title }}</header>
  <div class="card-body">{!! $slot !!}</div>
  <footer>{!! $footer !!}</footer>
</article>`,
  );

  const engine = new ViewEngine(basePath, { path: 'resources/views' });
  return { basePath, engine };
}

describe('ViewEngine', () => {
  it('renders layouts, sections, control flow, and components', async () => {
    const { engine } = createFixture();

    const html = await engine.render('welcome', {
      name: 'Ada',
      showDetails: true,
      users: ['Grace', 'Alan'],
      greeting: 'Welcome back',
    });

    expect(html).toMatch(/<title>\s*Welcome\s*<\/title>/);
    expect(html).toContain('<h1>Hello Ada</h1>');
    expect(html).toContain('<p>Users: 2</p>');
    expect(html).toContain('<li>Grace</li>');
    expect(html).toContain('<div class="alert">Welcome back</div>');
  });

  it('renders component blocks with default and named slots', async () => {
    const { basePath, engine } = createFixture();
    writeFileSync(
      join(basePath, 'resources/views/post.tyr'),
      `@component('components.card', { title: 'Featured' })
  <p>{{ excerpt }}</p>
  @slot('footer')
    <a href="{{ url }}">Read more</a>
  @endslot
@endcomponent
`,
    );

    const html = await engine.render('post', {
      excerpt: 'Hello world',
      url: '/posts/1',
    });

    expect(html).toContain('<header>Featured</header>');
    expect(html).toContain('<div class="card-body">');
    expect(html).toContain('<p>Hello world</p>');
    expect(html).toContain('<footer>');
    expect(html).toContain('<a href="/posts/1">Read more</a>');
  });

  it('keeps inline one-line components working', async () => {
    const { engine } = createFixture();

    const html = await engine.render('welcome', {
      name: 'Ada',
      showDetails: false,
      users: [],
      greeting: 'Hi',
    });

    expect(html).toContain('<div class="alert">Hi</div>');
  });

  it('renders push and stack directives into layouts', async () => {
    const { basePath, engine } = createFixture();
    writeFileSync(
      join(basePath, 'resources/views/layouts/stacked.tyr'),
      `<html>
<head>@stack('styles')</head>
<body>
  @yield('content')
  @stack('scripts')
</body>
</html>`,
    );
    writeFileSync(
      join(basePath, 'resources/views/stacked-page.tyr'),
      `@layout('layouts.stacked')

@section('content')
  <main>Hello</main>
@endsection

@push('styles')
  <link rel="stylesheet" href="/app.css">
@endpush

@push('scripts')
  <script src="/app.js"></script>
@endpush
`,
    );

    const html = await engine.render('stacked-page', {});

    expect(html).toContain('<link rel="stylesheet" href="/app.css">');
    expect(html).toContain('<script src="/app.js"></script>');
    expect(html).toContain('<main>Hello</main>');
    expect(html.indexOf('<head>')).toBeLessThan(html.indexOf('<link'));
    expect(html.indexOf('<main>')).toBeLessThan(html.indexOf('<script'));
  });

  it('renders forelse with empty branch', async () => {
    const { basePath, engine } = createFixture();
    writeFileSync(
      join(basePath, 'resources/views/items.tyr'),
      `<ul>
@forelse (items as item)
  <li>{{ item }}</li>
@empty
  <li class="empty">No items</li>
@endforelse
</ul>
`,
    );

    const populated = await engine.render('items', { items: ['A', 'B'] });
    expect(populated).toContain('<li>A</li>');
    expect(populated).toContain('<li>B</li>');
    expect(populated).not.toContain('No items');

    const empty = await engine.render('items', { items: [] });
    expect(empty).toContain('<li class="empty">No items</li>');
  });

  it('renders unless, isset, and empty directives', async () => {
    const { basePath, engine } = createFixture();
    writeFileSync(
      join(basePath, 'resources/views/conditionals.tyr'),
      `@unless (hidden)
  <p>Shown unless hidden</p>
@endunless

@isset (title)
  <h1>{{ title }}</h1>
@endisset

@empty (tags)
  <p>No tags yet</p>
@endempty
`,
    );

    const html = await engine.render('conditionals', {
      hidden: false,
      title: 'Dashboard',
      tags: [],
    });

    expect(html).toContain('<p>Shown unless hidden</p>');
    expect(html).toContain('<h1>Dashboard</h1>');
    expect(html).toContain('<p>No tags yet</p>');

    const hidden = await engine.render('conditionals', {
      hidden: true,
      title: undefined,
      tags: ['news'],
    });

    expect(hidden).not.toContain('Shown unless hidden');
    expect(hidden).not.toContain('<h1>');
    expect(hidden).not.toContain('No tags yet');
  });

  it('renders custom directives, composers, and expression helpers', async () => {
    const { basePath, engine } = createFixture();

    engine.directive('badge', (expression, context) => {
      const label = expression || 'default';
      const value = (context as Record<string, unknown>)[label];
      return `<span class="badge">${String(value ?? '')}</span>`;
    });

    engine.composer('posts.*', () => ({ section: 'News' }));
    engine.share({ appName: 'Tyravel' });
    engine.setBindings({
      route: (name) => `/${name}`,
      asset: (path) => `/assets${path}`,
      config: (key) => (key === 'app.name' ? 'Tyravel' : ''),
      old: (key, defaultValue) => (key === 'email' ? 'ada@example.com' : defaultValue),
    });

    mkdirSync(join(basePath, 'resources/views/posts'), { recursive: true });
    writeFileSync(
      join(basePath, 'resources/views/posts/show.tyr'),
      `<h1>{{ section }} / {{ appName }}</h1>
<p>{{ config('app.name') }}</p>
<a href="{{ route('home') }}">Home</a>
<img src="{{ asset('/logo.png') }}">
<input value="{{ old('email', '') }}">
@badge(status)
`,
    );

    const html = await engine.render('posts.show', { status: 'live' });

    expect(html).toContain('<h1>News / Tyravel</h1>');
    expect(html).toContain('<p>Tyravel</p>');
    expect(html).toContain('href="/home"');
    expect(html).toContain('src="/assets/logo.png"');
    expect(html).toContain('value="ada@example.com"');
    expect(html).toContain('<span class="badge">live</span>');
  });

  it('renders includeIf and includeWhen partials', async () => {
    const { basePath, engine } = createFixture();

    mkdirSync(join(basePath, 'resources/views/partials'), { recursive: true });
    writeFileSync(
      join(basePath, 'resources/views/partials/header.tyr'),
      `<header>{{ title }}</header>`,
    );
    writeFileSync(
      join(basePath, 'resources/views/partials/footer.tyr'),
      `<footer>Footer</footer>`,
    );
    writeFileSync(
      join(basePath, 'resources/views/partials-page.tyr'),
      `@includeIf('partials.header', { title: 'Home' })
@includeIf('partials.missing')
@includeWhen(showFooter, 'partials.footer')
`,
    );

    const html = await engine.render('partials-page', { showFooter: true });

    expect(html).toContain('<header>Home</header>');
    expect(html).toContain('<footer>Footer</footer>');
    expect(html).not.toContain('partials.missing');
  });

  it('renders auth directives from bindings', async () => {
    const { basePath, engine } = createFixture();

    engine.setAuth({
      check: () => true,
      user: () => ({ name: 'Ada' }),
      can: (ability) => ability === 'edit',
    });

    writeFileSync(
      join(basePath, 'resources/views/auth-page.tyr'),
      `@auth
  <p>Welcome</p>
@endauth

@guest
  <p>Sign in</p>
@endguest

@can('edit', post)
  <button>Edit</button>
@endcan

@can('delete', post)
  <button>Delete</button>
@endcan
`,
    );

    const html = await engine.render('auth-page', { post: { id: 1 } });

    expect(html).toContain('<p>Welcome</p>');
    expect(html).not.toContain('Sign in');
    expect(html).toContain('<button>Edit</button>');
    expect(html).not.toContain('<button>Delete</button>');
  });

  it('escapes echoed values by default', async () => {
    const { basePath, engine } = createFixture();
    writeFileSync(
      join(basePath, 'resources/views/unsafe.tyr'),
      `<p>{{ payload }}</p>`,
    );

    const html = await engine.render('unsafe', {
      payload: '<script>alert(1)</script>',
    });

    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });
});