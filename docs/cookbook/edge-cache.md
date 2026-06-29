# Edge response cache

Serve cacheable public GET responses from an edge network using Pondoknusa's **ETag middleware** (Tier 15) and your CDN or reverse proxy replay cache.

For Cloudflare-specific architecture (proxy + R2 + origin on Fly/Railway), start with the [Cloudflare deployment guide](/guide/deployment/cloudflare).

## App setup

Wrap safe, idempotent GET routes with HTTP cache middleware:

```typescript
import { createHash } from 'node:crypto';
import { createHttpCacheMiddleware } from '@pondoknusa/http';

function hashBody(body: string): string {
  return createHash('sha256').update(body).digest('hex');
}

Route.get('/posts/:slug', showPost, {
  middleware: [
    createHttpCacheMiddleware({
      maxAge: 300,
      etag: async (_request, body) => hashBody(body),
    }),
  ],
});
```

Pondoknusa emits `ETag` and honors `If-None-Match` with `304 Not Modified` when content is unchanged.

## Cloudflare (recommended pairing)

Typical stack: **Node origin** (Fly/Railway/Docker) + **Cloudflare proxy** in front.

1. Orange-cloud your domain to the origin hostname.
2. SSL mode: **Full (strict)**.
3. Add **Cache Rules** for public `GET` routes:

```
(http.request.method eq "GET" and starts_with(http.request.uri.path, "/posts/"))
```

4. Enable **Origin Cache Control** and respect `ETag` revalidation.
5. Create a **Cache Rule** bypass for `/dashboard/*`, `/api/me`, and any route that sets `Set-Cookie`.

### Cacheable vs bypass

| Route type | Edge cache? |
|------------|-------------|
| Public blog post HTML | Yes — short `max-age` + ETag |
| Authenticated dashboard | **Bypass** |
| JSON API with personal data | **Bypass** |
| Versioned assets (`/build/*`) | Yes — long `max-age`, fingerprinted filenames |
| WebSocket upgrade | **Bypass** (auto) |

### Tiered cache

Enable **Tiered Cache** in Cloudflare to reduce origin load for global audiences. Origin still runs Pondoknusa SSR; edge serves repeat views of cacheable pages.

## Fly.io

- Terminate TLS at Fly; run Pondoknusa with `prepareHttpServer()` and warmed route/view caches.
- Set `Cache-Control` on public responses.
- Multiple machines do not need sticky sessions for cacheable GET routes.
- Dynamic session HTML: disable edge cache; use Pondoknusa `Cache.remember()` at origin.

## Railway / nginx

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=pondoknusa:10m;

location /public/ {
  proxy_cache pondoknusa;
  proxy_cache_valid 200 5m;
  proxy_cache_revalidate on;
  proxy_pass http://127.0.0.1:3000;
}
```

Ensure Pondoknusa sends `ETag` so nginx can revalidate instead of serving stale content indefinitely.

## Related

- [Cloudflare deployment](/guide/deployment/cloudflare)
- [Deployment overview](/guide/deployment)
- [Cache](/guide/cache) — `Cache.remember()` and Redis
- [Performance](/guide/performance) — boot profile and clustering