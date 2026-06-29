# Views

Register `ViewServiceProvider` and add `config/views.ts`. Templates live in `resources/views/` as `.tyr` files.

```typescript
import { View, setViewApplication } from '@pondoknusa/core';
import { Response } from '@pondoknusa/http';

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

Generate views with `pondoknusa make:view pages.about`.

## Server-side rendering

Pondoknusa supports progressive enhancement: render HTML on the server, then hydrate interactive regions on the client.

### Document shell

Use `Response.ssr()` to wrap a rendered view in a complete HTML document and inject the hydration manifest:

```typescript
import { Route, View } from '@pondoknusa/core';
import { Response } from '@pondoknusa/http';

Route.get('/', async () => {
  const html = await View.render('welcome', { name: 'Ada' });

  return Response.ssr(html, {
    hydrationManifest: View.getHydrationManifest(),
  });
});
```

`buildSsrDocument()` from `@pondoknusa/http` performs the same wrapping when you need the HTML string without building a `Response`.

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
import { registerIsland } from '@pondoknusa/ssr';

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
import { hydrate } from '@pondoknusa/ssr';

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

Mark expensive pure components with `@memo` (or `@@memo`) at the top of the `.tyr` file. Pondoknusa caches rendered HTML keyed by props hash — skip when the parent passes dynamic slots.

```html
@@memo(300)
@props({ label: '' })
<span class="badge">{{ label }}</span>
```

`View.streamSsr()` pipes `View.renderStream()` through `Response.ssrStream()`, which **flushes the document shell** (`<head>` + CSS links) before the first view chunk, then streams body content, and injects the hydration manifest after the view stream completes. The Node HTTP adapter flushes each chunk as it is produced.

Lower-level control is still available when you need it:

```typescript
return Response.ssrStream(View.renderStream('dashboard', context, handlers), {
  title: 'Dashboard',
  hydrationManifest: () => View.getHydrationManifest(),
});
```

`View.renderStream()` yields HTML in document order: shell markup, then each stream section as it resolves.

Scaffold a new island with `pondoknusa make:island counter`. That creates `resources/views/islands/counter.tyr`, `resources/client/islands/counter.ts`, and registers the client mount in your bundle entry.

### Programmatic `.tyr.ts` views (stable)

Programmatic views are **stable** as of Pondoknusa 1.2. The contract is:

1. A `.tyr.ts` file exports `render(props)` returning HTML (or a `TemplateResult`).
2. Optional `mount(element, props)` registers client behavior for the same island id.
3. Register with `registerProgrammaticIsland(id, module)` on the client.

Use `pondoknusa make:island counter --programmatic` to scaffold a reference implementation:

```typescript
@island('counter', { count: 0 })
@endisland
```

```typescript
import * as counterIsland from '../views/islands/counter.tyr.js';
import { registerProgrammaticIsland } from '@pondoknusa/ssr';

registerProgrammaticIsland('counter', counterIsland);
```

`await View.catalog()` returns `{ components, islands }` so tooling can see which views declare each island id and whether a client or programmatic mount exists. For design-system JSON export, use `pondoknusa view:catalog --json`.