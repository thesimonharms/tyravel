# Deployment

Pondoknusa runs in production on **Node.js 26+** (or Bun) behind `pondoknusa start`. This guide is the hub for shipping apps to Docker, managed platforms, Cloudflare-backed origins, and (eventually) Pondoknusa Cloud.

## Choose your path

| Goal | Guide |
|------|-------|
| Compare platforms and app shapes | [Platform matrix](/guide/deployment/platforms) |
| Fastest managed deploy | [Railway](/guide/deployment/railway) |
| Multi-region + Postgres | [Fly.io](/guide/deployment/fly) |
| Containers / Kubernetes / VPS | [Docker](/guide/deployment/docker) |
| Cloudflare CDN, R2, partial edge | [Cloudflare](/guide/deployment/cloudflare) |
| Automated pipelines | [CI/CD](/guide/deployment/ci-cd) |
| Future managed hosting | [Pondoknusa Cloud](/guide/deployment/pondoknusa-cloud) (planned) |
| Backend-only API | [Headless API](/guide/headless) |

Example manifests: [`examples/hello-world/deploy/`](https://github.com/pondoknusa/pondoknusa/tree/main/examples/hello-world/deploy), [`examples/headless-api/deploy/`](https://github.com/pondoknusa/pondoknusa/tree/main/examples/headless-api/deploy).

## Production checklist

Complete on every release:

```bash
# 1. Environment
export NODE_ENV=production
export APP_ENV=production
export APP_DEBUG=false
export APP_URL=https://your-domain.example
export PONDOKNUSA_HOST=0.0.0.0
export PONDOKNUSA_PORT=${PORT:-3000}

# 2. Database — Postgres or MySQL (not SQLite on ephemeral disks)
export DB_CONNECTION=postgres

# 3. Warm caches (CI build or release phase)
pondoknusa migrate
pondoknusa config:cache
pondoknusa route:cache
pondoknusa view:cache          # skip for headless

# 4. Gate (optional)
pondoknusa deploy:check

# 5. Start
pondoknusa start
```

With `NODE_ENV=production`, views default to `compiled: true` and `requireCompiledCache: true`. **Run `pondoknusa view:cache` before boot** or the app throws `CompiledViewCacheMissError`.

Keep `@pondoknusa/cli` in production `dependencies` so cache and migrate commands work inside containers (`npm ci --omit=dev`).

In `src/main.ts`, call `prepareHttpServer()` after `app.boot()` so route and middleware caches are validated at startup.

## Process model

| Process | Command | When |
|---------|---------|------|
| **Web** | `pondoknusa start` | Always — production HTTP server |
| **Web (scaled)** | `pondoknusa start --cluster` | Multi-core Node; requires Redis/DB sessions |
| **Queue** | `pondoknusa queue:work` | Separate container when using queued mail, events, notifications |
| **Scheduler** | `pondoknusa schedule:run` | Cron sidecar or platform scheduler |

Use `pondoknusa dev` / `pondoknusa serve` for local development only — they enable view hot reload.

```bash
# Horizontal scale on a single machine (Node cluster)
pondoknusa start --cluster --workers=4
```

## Architecture patterns

### Monolith (default)

One deploy runs SSR, API, sessions, and optional queues. Simplest operational model. Host on Fly, Railway, or Docker.

### Headless API

JSON-only apps skip views and Echo. Smaller images and faster cold start. Ideal behind [Cloudflare](/guide/deployment/cloudflare) for global APIs.

### CDN + origin

Put Cloudflare (or another CDN) in front of a Node origin for TLS, DDoS protection, and edge caching of public GET routes. Pondoknusa ships `ETag` / `304` middleware — see [edge cache cookbook](/cookbook/edge-cache).

### Split front-end

Static SPA on Cloudflare Pages; Pondoknusa headless API on Fly/Railway. Common for mobile + web clients sharing one API.

## Cloudflare summary

Cloudflare is **modular** — enable only the pieces you need (proxy, CDN, R2, Pages, tunnel, WAF). Pondoknusa still runs on Node; pick modules in [Cloudflare deployment](/guide/deployment/cloudflare) or `deploy/cloudflare.md` in your project.

| Works today | Not yet |
|-------------|---------|
| DNS proxy, WAF, TLS (Module 1) | Full app on Workers |
| CDN + ETag cache (Module 2) | `pondoknusa queue:work` on edge |
| R2 storage (Module 3) | D1 as Pondoknusa database |
| Pages static, Tunnel previews | SSR compile on Workers |

## Pondoknusa Cloud (planned)

Managed git-push deploy with Postgres, Redis, R2, and CDN — similar to Laravel Cloud or Vercel for Next.js. Not available yet; use platform guides above. See [Pondoknusa Cloud](/guide/deployment/pondoknusa-cloud).

## Environment variables

| Variable | Production |
|----------|------------|
| `NODE_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_URL` | Public HTTPS URL |
| `PONDOKNUSA_HOST` | `0.0.0.0` |
| `PONDOKNUSA_PORT` | Platform `PORT` |
| `DB_CONNECTION` | `postgres` or `mysql` |
| `DB_POOL_WARMUP` | `true` |
| `CACHE_STORE` | `redis` when Redis is available |
| `QUEUE_CONNECTION` | `database` or `redis` |
| `SESSION_ENCRYPT` | `true` with `@pondoknusa/crypto` |
| `BROADCAST_CONNECTION` | `websocket` + Redis for multi-instance |

Full map: [Configuration reference](/guide/configuration-reference).

## Health checks

| Path | Use |
|------|-----|
| `/health/live` | Liveness — process up |
| `/health/ready` | Readiness — DB + optional Redis |
| `/health` | Alias for readiness |

Point load balancer readiness probes at `/health/ready`.

## Performance defaults

Production scaffolds enable Tier 19 speed features when `APP_DEBUG=false`:

- JSON fast path, request pooling, early 404
- Config/route cache, pool warm-up, view LRU
- See [Performance](/guide/performance) for tuning, clustering, and `pondoknusa build` bundles.

## Troubleshooting

| Issue | Check |
|-------|-------|
| `CompiledViewCacheMissError` | Run `pondoknusa view:cache` in build |
| 502 behind CDN | Origin listening on `0.0.0.0`; health probe path |
| Sessions flip between workers | Redis or database session driver |
| Queue jobs never run | Separate `queue:work` process |
| Slow boot | `config:cache`, `preloadCompiled`, `DB_POOL_WARMUP` |

## Related

- [Performance](/guide/performance)
- [Benchmarks](/guide/benchmarks)
- [Observability cookbook](/cookbook/observability)
- [Broadcasting](/guide/broadcasting) — WebSocket proxy
- [Tutorial 4: Realtime & deploy](/tutorials/04-realtime-and-deploy)