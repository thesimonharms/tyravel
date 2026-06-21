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