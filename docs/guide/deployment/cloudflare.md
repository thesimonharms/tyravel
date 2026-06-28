# Deploy with Cloudflare

Cloudflare integrates with Tyravel as **optional modules** — pick only what you need. Tyravel **1.x** still runs on **Node.js** (Fly, Railway, Docker, VPS). Full Tyravel on **Workers** is not supported yet.

New apps ship a copy-paste guide at `deploy/cloudflare.md` with the same module layout.

## Pick your modules

| I want… | Module | Needs Node origin? |
|---------|--------|-------------------|
| TLS, DDoS, hide origin IP | [Module 1: DNS + proxy](#module-1-dns--proxy) | Yes |
| Cache public GET at the edge | [Module 2: CDN + edge cache](#module-2-cdn--edge-cache) | Yes (usually with Module 1) |
| S3-compatible file storage | [Module 3: R2](#module-3-r2-object-storage) | Yes for uploads; no proxy required |
| Host Vite/client build | [Module 4: Pages](#module-4-pages-static-assets) | API/SSR on separate host |
| Staging without public ports | [Module 5: Tunnel](#module-5-tunnel-previews) | Yes (local or remote) |
| WAF, rate limits, bots | [Module 6: WAF + security](#module-6-waf--security) | Yes (usually with Module 1) |

Deploy the Node origin first — [Fly.io](/guide/deployment/fly), [Railway](/guide/deployment/railway), or [Docker](/guide/deployment/docker).

## Common combinations

| Stack | Modules |
|-------|---------|
| CDN in front of full-stack SSR | 1 + 2 |
| API + R2 uploads | 1 + 3 (or 3 alone for storage) |
| SPA on Pages, API on Fly | 1 + 4 (+ 3 optional) |
| Production + staging tunnel | 1 + 2 + 5 |
| Hardened public API | 1 + 2 + 6 |

## Product status

| Cloudflare product | Tyravel integration | Module |
|--------------------|---------------------|--------|
| DNS + proxy | Origin on Node | 1 |
| Cache / CDN | `ETag` middleware + cache rules | 2 |
| R2 | `@tyravel/storage-r2` | 3 |
| Pages | Vite/client `dist/` | 4 |
| Tunnel | Preview/staging | 5 |
| WAF / DDoS / TLS | In front of origin | 1, 6 |
| **Workers** (full Tyravel) | — | Not supported (roadmap) |
| **D1** | — | Not supported |
| **Queues** (CF) | — | Use `tyravel queue:work` on origin |

---

## Module 1: DNS + proxy

**When:** Custom domain, free TLS, DDoS protection, orange-cloud origin masking.

**Prerequisites:** Tyravel running with a public hostname.

1. Add the domain in Cloudflare **DNS**.
2. Create a **proxied** record — CNAME to Fly/Railway hostname, or A/AAAA to a VPS IP.
3. **SSL/TLS** → **Full (strict)**.
4. Origin env:

```bash
APP_URL=https://your-domain.example
TYRAVEL_HOST=0.0.0.0
SESSION_SECURE=true
```

Use `TRUST_PROXY=true` when the app reads `X-Forwarded-*`. WebSocket upgrades pass through; broadcasting still terminates on the Node origin (Redis fan-out for multiple instances).

**Standalone:** TLS + DDoS without edge caching.

---

## Module 2: CDN + edge cache

**When:** Repeat traffic to public, cacheable `GET` routes.

**Prerequisites:** [Module 1](#module-1-dns--proxy) or another CDN in front of the same origin.

```typescript
import { createHttpCacheMiddleware } from '@tyravel/http';

Route.get('/posts/:slug', showPost, {
  middleware: [createHttpCacheMiddleware({ maxAge: 300 })],
});
```

In Cloudflare: enable **Origin Cache Control**, add **Cache Rules** for public `GET` paths, and **bypass** authenticated routes (`/dashboard/*`, anything with `Set-Cookie`). See [edge cache cookbook](/cookbook/edge-cache).

| Route | Edge cache? |
|-------|-------------|
| Public HTML / JSON | Yes — short `max-age` + ETag |
| Session / dashboard | **Bypass** |
| `/build/*` fingerprinted assets | Yes — long `max-age` |
| WebSocket | **Bypass** |

**Skip** if all routes are personalized or you only need TLS (Module 1).

---

## Module 3: R2 object storage

**When:** Uploads, exports, or static blobs — independent of proxy/CDN.

**Prerequisites:** Node origin. Works **without** Module 1.

```bash
npm install @tyravel/storage-r2
```

Register `R2StorageServiceProvider` and configure `config/storage.ts`. Full config: [Storage guide](/guide/storage).

```bash
R2_BUCKET=tyravel
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_PUBLIC_URL=https://files.your-domain.example  # optional
```

**Standalone:** Storage only — no Cloudflare proxy required.

---

## Module 4: Pages (static assets)

**When:** SPA front-end; Tyravel API or SSR on a subdomain.

| Host | Serves |
|------|--------|
| `www.example.com` (Pages) | Vite client `dist/` |
| `api.example.com` (Node) | Tyravel ([headless](/guide/headless) or full stack) |

Connect Pages to Git or `wrangler pages deploy dist`. Point `api.example.com` through Module 1 at the Tyravel origin. Set `VITE_API_URL` on the client build.

Subdomain split is simpler than single-hostname origin rules. Headless API origins skip `view:cache`.

---

## Module 5: Tunnel (previews)

**When:** Staging, PR previews, local demos.

```bash
# Quick (no account)
cloudflared tunnel --url http://127.0.0.1:3000

# Named tunnel
cloudflared tunnel create tyravel-staging
cloudflared tunnel route dns tyravel-staging staging.example.com
cloudflared tunnel run tyravel-staging
```

Set `APP_URL` to the tunnel hostname. Not a production origin replacement.

---

## Module 6: WAF + security

**When:** Public API or SSR behind Module 1.

**Prerequisites:** [Module 1](#module-1-dns--proxy).

- WAF managed rulesets
- Rate limiting on `/api/*` or login routes
- Bot Fight Mode (test against legitimate API clients)
- Disable Rocket Loader on WebSocket or strict CSP paths

Pair with Tyravel auth throttling and `APP_DEBUG=false`.

---

## Not supported on Workers (yet)

| Tyravel requirement | Workers limitation |
|---------------------|-------------------|
| Node.js 26+ (`node:sqlite`, etc.) | Subset compat |
| `view:cache`, framework disk | No persistent local disk |
| `tyravel queue:work` | No long-lived processes |
| `tyravel start --cluster` | Isolates, not `node:cluster` |
| WebSocket hub + Redis | Custom fan-out needed |

Planned: headless JSON on Workers + Hyperdrive, then precompiled SSR. See [Tyravel Cloud](/guide/deployment/tyravel-cloud) and [ROADMAP](https://github.com/thesimonharms/tyravel/blob/main/ROADMAP.md).

---

## Troubleshooting by module

| Module | Symptom | Fix |
|--------|---------|-----|
| 1 | Redirect loop | SSL **Full (strict)**; valid origin HTTPS |
| 1 | Wrong client IP | `TRUST_PROXY=true` |
| 2 | Stale HTML | Shorter `max-age`; bypass auth; ETag |
| 2 | Session lost | Bypass `Set-Cookie` routes; `SESSION_SECURE=true` |
| 3 | R2 403 | Token permissions; bucket CORS |
| 4 | CORS errors | API allows Pages origin |
| 5 | Tunnel 502 | `TYRAVEL_HOST=0.0.0.0` on origin |
| 6 | WS drops | Bypass Rocket Loader |

---

## Related

- `deploy/cloudflare.md` in new Tyravel projects (modular recipes)
- [Platform matrix](/guide/deployment/platforms)
- [Edge response cache](/cookbook/edge-cache)
- [Storage](/guide/storage)
- [Headless API](/guide/headless)