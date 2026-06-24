# Views

Register `ViewServiceProvider` and add `config/views.ts`. Templates live in `resources/views/` as `.tyr` files.

```typescript
import { View, setViewApplication } from '@tyravel/core';
import { Response } from '@tyravel/http';

setViewApplication(app);

Route.get('/', async () =>
  Response.html(await View.render('welcome', { name: 'Ada' })),
);
```

## Template syntax

```html
@layout('layouts.app')

@section('content')
  <h1>Hello {{ name }}</h1>
  @if (users.length)
    @foreach (users as user)
      <p>{{ user.name }}</p>
    @endforeach
  @endif
@endsection
```

- `{{ }}` — escaped output
- `{!! !!}` — raw HTML
- `@layout`, `@section`, `@yield` — layouts
- `@component` — reusable partials

Generate views with `tyravel make:view pages.about`.

## Server-side rendering

Tyravel supports progressive enhancement: render HTML on the server, then hydrate interactive regions on the client.

### Document shell

Use `Response.ssr()` to wrap a rendered view in a complete HTML document and inject the hydration manifest:

```typescript
import { Route, View } from '@tyravel/core';
import { Response } from '@tyravel/http';

Route.get('/', async () => {
  const html = await View.render('welcome', { name: 'Ada' });

  return Response.ssr(html, {
    hydrationManifest: View.getHydrationManifest(),
  });
});
```

`buildSsrDocument()` from `@tyravel/http` performs the same wrapping when you need the HTML string without building a `Response`.

The manifest is serialized into `<script type="application/json" id="tyr-hydration">` before `</body>`.

### Islands

Mark interactive regions with `@island`. The server renders fallback HTML; the client mounts a registered handler for the same id.

```html
@island('counter', { count: 0 })
  <button type="button" class="counter">0</button>
@endisland
```

Register the client mount function in `resources/client/`:

```typescript
import { registerIsland } from '@tyravel/ssr';

registerIsland('counter', ({ element, props }) => {
  const button = element.querySelector('button');
  let count = Number(props.count ?? 0);

  button?.addEventListener('click', () => {
    count += 1;
    if (button) button.textContent = String(count);
  });
});
```

Bootstrap hydration after the page loads:

```typescript
import { hydrate } from '@tyravel/ssr';

hydrate();
```

`hydrate()` reads `data-tyr-island` markers (and the optional `#tyr-hydration` manifest) and calls the matching `registerIsland()` handler.

### Streaming layouts

For slow sections, stream the layout shell first and fill `@stream` regions asynchronously:

```html
@stream('sidebar')
  <aside>Loading…</aside>
@endstream
```

Return a chunked SSR response in one call — no manual async iteration in the controller:

```typescript
Route.get('/dashboard', () =>
  View.streamSsr('dashboard', context, {
    sidebar: async () => '<aside>Fresh sidebar</aside>',
  }),
);
```

`View.streamSsr()` pipes `View.renderStream()` through `Response.ssrStream()`, which wraps the HTML in a document shell and injects the hydration manifest after the view stream completes. The Node HTTP adapter flushes each chunk as it is produced.

Lower-level control is still available when you need it:

```typescript
return Response.ssrStream(View.renderStream('dashboard', context, handlers), {
  title: 'Dashboard',
  hydrationManifest: () => View.getHydrationManifest(),
});
```

`View.renderStream()` yields HTML in document order: shell markup, then each stream section as it resolves.

Scaffold a new island with `tyravel make:island counter`. That creates `resources/views/islands/counter.tyr`, `resources/client/islands/counter.ts`, and registers the client mount in your bundle entry.