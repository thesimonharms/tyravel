# Cloudflare (modular)

Use only the modules you need. Pondoknusa **1.x** runs on **Node.js** (Fly, Railway, Docker, or a VPS) — Cloudflare products sit in front of or beside that origin. Full Pondoknusa on **Workers** is not supported yet.

Full docs: [pondoknusa.dev/guide/deployment/cloudflare](https://pondoknusa.dev/guide/deployment/cloudflare)

## Pick your modules

| I want… | Module | Needs origin? |
|---------|--------|---------------|
| TLS, DDoS, hide origin IP | [DNS + proxy](#module-1-dns--proxy) | Yes |
| Cache public HTML/API at the edge | [CDN + cache rules](#module-2-cdn--edge-cache) | Yes (usually with Module 1) |
| File uploads / S3-compatible storage | [R2 storage](#module-3-r2-object-storage) | Yes (uploads from Node) |
| Host Vite/client build output | [Pages (static)](#module-4-pages-static-assets) | API/SSR elsewhere |
| Share staging without opening ports | [Tunnel](#module-5-tunnel-previews) | Yes (local or remote) |
| Bot protection, rate limits | [WAF + security](#module-6-waf--security) | Yes (usually with Module 1) |

**Origin** — deploy Pondoknusa with the manifests in this folder (`fly.toml`, `railway.toml`, `docker-compose.yml`) before enabling proxy or CDN modules.

## Common combinations

| Stack | Modules |
|-------|---------|
| CDN in front of monolith | 1 + 2 |
| API + R2 uploads | 1 + 3 |
| SPA on Pages, API on Fly | 1 + 4 (+ 3 optional) |
| Production Fly + staging tunnel | 1 + 2 + 5 |
| Hardened public API | 1 + 2 + 6 |

---

## Module 1: DNS + proxy

**When:** Custom domain, free TLS, DDoS protection, orange-cloud hiding of origin IP.

**Prerequisites:** Pondoknusa running on a host with a public hostname (see `fly.toml` / `railway.toml` / Docker).

1. Add the domain in Cloudflare **DNS**.
2. Create a **proxied** (orange cloud) record:
   - **CNAME** `@` or `www` → your Fly/Railway hostname, or
   - **A/AAAA** → origin IP (VPS/Docker).
3. **SSL/TLS** → **Full (strict)** (origin must serve valid HTTPS).
4. Set origin env:

```bash
APP_URL=https://your-domain.example
PONDOKNUSA_HOST=0.0.0.0
SESSION_SECURE=true
```

Use `TRUST_PROXY=true` if your app reads `X-Forwarded-*` for client IP or scheme.

**WebSockets:** Proxy passes upgrades through by default. Broadcasting still terminates on the Node origin; use Redis fan-out when running multiple instances.

**This module alone:** Enough for TLS + DDoS without edge caching.

---

## Module 2: CDN + edge cache

**When:** Repeat traffic to public, cacheable `GET` routes (blog posts, marketing pages, versioned assets).

**Prerequisites:** [Module 1](#module-1-dns--proxy) (or another CDN in front of the same origin).

### App: HTTP cache middleware

```typescript
import { createHttpCacheMiddleware } from '@pondoknusa/http';

Route.get('/posts/:slug', showPost, {
  middleware: [createHttpCacheMiddleware({ maxAge: 300 })],
});
```

### Cloudflare: cache rules

1. **Caching** → enable **Origin Cache Control**.
2. **Cache Rules** → cache public `GET` paths, e.g.:

```
(http.request.method eq "GET" and starts_with(http.request.uri.path, "/posts/"))
```

3. Add a **bypass** rule for authenticated areas (`/dashboard/*`, `/api/me`, anything setting `Set-Cookie`).
4. Optional: enable **Tiered Cache** for global audiences.

| Route | Edge cache? |
|-------|-------------|
| Public HTML / JSON | Yes — short `max-age` + ETag |
| Dashboard / session HTML | **Bypass** |
| `/build/*` fingerprinted assets | Yes — long `max-age` |
| WebSocket upgrade | **Bypass** (automatic) |

More examples: [edge cache cookbook](https://pondoknusa.dev/cookbook/edge-cache).

**Skip this module** if every route is personalized or you only need TLS (Module 1).

---

## Module 3: R2 object storage

**When:** User uploads, exports, or static files in object storage — independent of CDN/proxy.

**Prerequisites:** Node origin (uploads use the S3-compatible API from Pondoknusa). Works **without** Module 1.

```bash
npm install @pondoknusa/storage-r2
```

```typescript
// config/storage.ts
export default {
  default: 'r2',
  disks: {
    r2: {
      driver: 'r2',
      bucket: env('R2_BUCKET', 'pondoknusa'),
      endpoint: env('R2_ENDPOINT'), // https://<account>.r2.cloudflarestorage.com
      accessKeyId: env('R2_ACCESS_KEY_ID'),
      secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
      publicUrl: env('R2_PUBLIC_URL'), // optional custom domain or r2.dev
    },
  },
} satisfies StorageConfig;
```

```typescript
// src/main.ts
import { R2StorageServiceProvider } from '@pondoknusa/storage-r2';

app.register(R2StorageServiceProvider);
```

Origin env:

```bash
R2_BUCKET=pondoknusa
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_PUBLIC_URL=https://files.your-domain.example  # optional
```

Create an R2 API token with Object Read & Write on the bucket. Configure bucket CORS if browsers upload directly.

**This module alone:** Storage only — no Cloudflare proxy required.

---

## Module 4: Pages (static assets)

**When:** UI is a Vite/React/Vue SPA; Pondoknusa serves API and/or SSR on a subdomain.

**Prerequisites:** Separate Node deploy for API/SSR (this folder’s Fly/Railway/Docker manifests).

| Host | Serves |
|------|--------|
| `www.example.com` (Pages) | `dist/` / Vite client build |
| `api.example.com` (Node) | Pondoknusa headless or full stack |

1. Connect the Pages project to your Git repo (or `wrangler pages deploy dist`).
2. Build command: `npm run build` (client only).
3. Point `api.example.com` DNS (Module 1) at the Pondoknusa origin.
4. Set client env `VITE_API_URL=https://api.example.com`.

**Origin rules (optional):** Serve `/build/*` from Pages and proxy everything else to Node on one hostname — more complex; subdomain split is simpler.

**Headless API:** Ideal pairing — skip `view:cache` on the API origin.

---

## Module 5: Tunnel (previews)

**When:** Staging, PR previews, or local demos without public ingress.

**Prerequisites:** Pondoknusa listening locally or on a private host (`pondoknusa start` / `pondoknusa dev`).

Quick tunnel (no account):

```bash
cloudflared tunnel --url http://127.0.0.1:3000
```

Named tunnel (persistent hostname):

```bash
cloudflared tunnel create pondoknusa-staging
cloudflared tunnel route dns pondoknusa-staging staging.example.com
cloudflared tunnel run pondoknusa-staging
```

Set `APP_URL` to the tunnel hostname. Not a replacement for production origin hosting — use Module 1 for production.

---

## Module 6: WAF + security

**When:** Public API or SSR behind Module 1; bot traffic, geo rules, or rate limits.

**Prerequisites:** [Module 1](#module-1-dns--proxy).

Examples (enable as needed):

- **WAF** managed rulesets on the zone.
- **Rate limiting** on `/api/*` or login routes.
- **Bot Fight Mode** / Super Bot Fight (may affect legitimate API clients — test first).
- Disable **Rocket Loader** on paths that use WebSockets or strict CSP.

Pair with Pondoknusa auth throttling and `APP_DEBUG=false` on the origin.

---

## Not supported on Cloudflare (1.x)

| Product | Status |
|---------|--------|
| **Workers** (full Pondoknusa) | Roadmap — needs HTTP kernel + boot adapter |
| **D1** | Use Postgres/MySQL on origin |
| **Cloudflare Queues** | Use `pondoknusa queue:work` on origin |

Headless JSON on Workers + Hyperdrive is planned; track [ROADMAP](https://github.com/pondoknusa/pondoknusa/blob/main/ROADMAP.md).

---

## Troubleshooting by module

| Module | Symptom | Fix |
|--------|---------|-----|
| 1 | Redirect loop | SSL **Full (strict)**; origin HTTPS valid |
| 1 | Wrong client IP | `TRUST_PROXY=true`; check `CF-Connecting-IP` |
| 2 | Stale HTML | Shorter `max-age`; bypass auth routes; ETag middleware |
| 2 | Session lost | Bypass cache on `Set-Cookie` routes; `SESSION_SECURE=true` |
| 3 | R2 403 | Token permissions; bucket CORS |
| 4 | CORS errors | API allows Pages origin; correct `VITE_API_URL` |
| 5 | Tunnel 502 | Origin on `127.0.0.1:3000`; `PONDOKNUSA_HOST=0.0.0.0` |
| 6 | WS drops | Bypass Rocket Loader; confirm origin upgrade |

---

## Related

- [deploy/README.md](./README.md) — Docker, Fly, Railway
- [Deployment guide](https://pondoknusa.dev/guide/deployment)
- [Storage (R2)](https://pondoknusa.dev/guide/storage)
