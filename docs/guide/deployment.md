# Deployment

Tyravel runs in production on **Node.js 26+** (or Bun) behind `tyravel start`. This guide is the hub for shipping apps to Docker, managed platforms, Cloudflare-backed origins, and (eventually) Tyravel Cloud.

## Choose your path

| Goal | Guide |
|------|-------|
| Compare platforms and app shapes | [Platform matrix](/guide/deployment/platforms) |
| Fastest managed deploy | [Railway](/guide/deployment/railway) |
| Multi-region + Postgres | [Fly.io](/guide/deployment/fly) |
| Containers / Kubernetes / VPS | [Docker](/guide/deployment/docker) |
| Cloudflare CDN, R2, partial edge | [Cloudflare](/guide/deployment/cloudflare) |
| Automated pipelines | [CI/CD](/guide/deployment/ci-cd) |
| Future managed hosting | [Tyravel Cloud](/guide/deployment/tyravel-cloud) (planned) |
| Backend-only API | [Headless API](/guide/headless) |

Example manifests: [`examples/hello-world/deploy/`](https://github.com/thesimonharms/tyravel/tree/main/examples/hello-world/deploy), [`examples/headless-api/deploy/`](https://github.com/thesimonharms/tyravel/tree/main/examples/headless-api/deploy).

## Production checklist

Complete on every release:

```bash
# 1. Environment
export NODE_ENV=production
export APP_ENV=production
export APP_DEBUG=false
export APP_URL=https://your-domain.example
export TYRAVEL_HOST=0.0.0.0
export TYRAVEL_PORT=${PORT:-3000}

# 2. Database — Postgres or MySQL (not SQLite on ephemeral disks)
export DB_CONNECTION=postgres

# 3. Warm caches (CI build or release phase)
tyravel migrate
tyravel config:cache
tyravel route:cache
tyravel view:cache          # skip for headless

# 4. Gate (optional)
tyravel deploy:check

# 5. Start
tyravel start
```

With `NODE_ENV=production`, views default to `compiled: true` and `requireCompiledCache: true`. **Run `tyravel view:cache` before boot** or the app throws `CompiledViewCacheMissError`.

Keep `@tyravel/cli` in production `dependencies` so cache and migrate commands work inside containers (`npm ci --omit=dev`).

In `src/main.ts`, call `prepareHttpServer()` after `app.boot()` so route and middleware caches are validated at startup.

## Process model

| Process | Command | When |
|---------|---------|------|
| **Web** | `tyravel start` | Always — production HTTP server |
| **Web (scaled)** | `tyravel start --cluster` | Multi-core Node; requires Redis/DB sessions |
| **Queue** | `tyravel queue:work` | Separate container when using queued mail, events, notifications |
| **Scheduler** | `tyravel schedule:run` | Cron sidecar or platform scheduler |

Use `tyravel dev` / `tyravel serve` for local development only — they enable view hot reload.

```bash
# Horizontal scale on a single machine (Node cluster)
tyravel start --cluster --workers=4
```

## Architecture patterns

### Monolith (default)

One deploy runs SSR, API, sessions, and optional queues. Simplest operational model. Host on Fly, Railway, or Docker.

### Headless API

JSON-only apps skip views and Echo. Smaller images and faster cold start. Ideal behind [Cloudflare](/guide/deployment/cloudflare) for global APIs.

### CDN + origin

Put Cloudflare (or another CDN) in front of a Node origin for TLS, DDoS protection, and edge caching of public GET routes. Tyravel ships `ETag` / `304` middleware — see [edge cache cookbook](/cookbook/edge-cache).

### Split front-end

Static SPA on Cloudflare Pages; Tyravel headless API on Fly/Railway. Common for mobile + web clients sharing one API.

## Cloudflare summary

| Works today | Not yet |
|-------------|---------|
| DNS proxy, WAF, TLS | Full app on Workers |
| CDN + cache rules + ETag | `tyravel queue:work` on edge |
| R2 storage (`@tyravel/storage-r2`) | D1 as Tyravel database |
| Tunnel for previews | SSR view compile on Workers |

**Recommended:** Node origin (Fly/Railway/Docker) + Cloudflare proxy + optional R2. Details in [Cloudflare deployment](/guide/deployment/cloudflare).

## Tyravel Cloud (planned)

Managed git-push deploy with Postgres, Redis, R2, and CDN — similar to Laravel Cloud or Vercel for Next.js. Not available yet; use platform guides above. See [Tyravel Cloud](/guide/deployment/tyravel-cloud).

## Environment variables

| Variable | Production |
|----------|------------|
| `NODE_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_URL` | Public HTTPS URL |
| `TYRAVEL_HOST` | `0.0.0.0` |
| `TYRAVEL_PORT` | Platform `PORT` |
| `DB_CONNECTION` | `postgres` or `mysql` |
| `DB_POOL_WARMUP` | `true` |
| `CACHE_STORE` | `redis` when Redis is available |
| `QUEUE_CONNECTION` | `database` or `redis` |
| `SESSION_ENCRYPT` | `true` with `@tyravel/crypto` |
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
- See [Performance](/guide/performance) for tuning, clustering, and `tyravel build` bundles.

## Troubleshooting

| Issue | Check |
|-------|-------|
| `CompiledViewCacheMissError` | Run `tyravel view:cache` in build |
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