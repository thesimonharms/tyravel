# Partial reload cookbook

Use partial HTML responses for sub-100ms UI updates without a full page reload. Pondoknusa supports Turbo Drive streams and HTMX-style fragment swaps via `View.partial()` and `Response.partial()`.

## Basic fragment

Return only the updated markup:

```typescript
import { Route, View } from '@pondoknusa/core';

Route.get('/posts/:id/comments', async ({ params }) => {
  const post = await Post.find(params.id);
  return View.partial('posts.comments', { post });
});
```

`View.partial()` renders the view (or an optional `fragment`) and wraps it with `Response.partial()`, setting headers for Turbo/HTMX clients.

## Named fragment

When the view defines `@fragment('list')`:

```typescript
return View.partial('posts.comments', { post }, { fragment: 'list' });
```

## Turbo Stream response

Emit a Turbo Stream payload for `turbo-stream` content type:

```typescript
return Response.partial('<turbo-stream action="replace" target="comments">…</turbo-stream>', {
  turboStream: true,
});
```

## HTMX swap

HTMX reads the response body and swaps the target element. Return the fragment only — no layout shell:

```html
<div id="comments">
  @each(comment in comments)
    <article>{{ comment.body }}</article>
  @endeach
</div>
```

Client markup:

```html
<button
  hx-get="/posts/1/comments"
  hx-target="#comments"
  hx-swap="innerHTML"
>
  Refresh
</button>
```

## When to use partial vs full SSR

| Approach | Best for |
|----------|----------|
| `View.partial()` | Small DOM updates, infinite scroll, inline edits |
| `View.streamSsr()` | First paint with streaming shell + slow sections |
| `View.render()` | Full page navigations, SEO-critical content |

## Related

- [Views & templating](/guide/views) — `View.partial()` and `@fragment`
- [Performance](/guide/performance) — caching hot read paths behind partial endpoints