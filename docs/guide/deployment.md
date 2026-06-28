# Deployment

Run Tyravel in production on **Node.js 26+** (or Bun). Apps boot through `src/main.ts` → `serve()` with graceful `SIGTERM` shutdown.

## Before you deploy

Complete this checklist on every target:

```bash
# 1. Production env
export NODE_ENV=production
export APP_ENV=production
export APP_DEBUG=false
export APP_URL=https://your-domain.example

# 2. Listen on all interfaces (required in containers)
export TYRAVEL_HOST=0.0.0.0
export TYRAVEL_PORT=${PORT:-3000}   # map platform PORT → TYRAVEL_PORT

# 3. Database — use Postgres or MySQL in production (not SQLite on ephemeral disks)
export DB_CONNECTION=postgres
# ... DB_HOST, DB_DATABASE, DB_USERNAME, DB_PASSWORD

# 4. Warm caches (run in CI release phase or container entrypoint)
tyravel migrate
tyravel route:cache
tyravel view:cache
```

With `NODE_ENV=production`, views default to `compiled: true` and `requireCompiledCache: true` — **you must run `tyravel view:cache` before boot** or the app throws `CompiledViewCacheMissError`.

Keep `@tyravel/cli` available in the deploy environment for `migrate`, `route:cache`, and `view:cache`. Either install it as a production dependency or run those commands in a build/release step before pruning dev dependencies.

## Process model

| Process | Command | Notes |
|---------|---------|-------|
| **Web** | `node --experimental-strip-types src/main.ts` | Primary HTTP + WebSocket upgrade |
| **Queue worker** | `tyravel queue:work` | Separate container/dyno when using queued mail, events, or broadcasts |
| **Scheduler** | `tyravel schedule:run` | Cron sidecar or platform scheduler hitting a protected route |

Do not use `tyravel serve` in production — it enables `TYRAVEL_VIEW_WATCH` and spawns a dev child process.

## Platform guides

| Guide | Best for |
|-------|----------|
| [Docker](/guide/deployment/docker) | Self-hosted, compose stacks, any container orchestrator |
| [Fly.io](/guide/deployment/fly) | Global edge, managed Postgres + Redis |
| [Railway](/guide/deployment/railway) | Fast managed deploy, plugins for Postgres/Redis |

Example manifests live in [`examples/hello-world/deploy/`](https://github.com/thesimonharms/tyravel/tree/main/examples/hello-world/deploy).

## Environment variables

| Variable | Production value |
|----------|------------------|
| `NODE_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_URL` | Public HTTPS URL (signed links, mail) |
| `TYRAVEL_HOST` | `0.0.0.0` |
| `TYRAVEL_PORT` | Platform `PORT` (Fly: `8080`, Railway: injected) |
| `SESSION_ENCRYPT` | `true` when using `@tyravel/crypto` |
| `QUEUE_CONNECTION` | `database` or `redis` |
| `BROADCAST_CONNECTION` | `websocket` when using realtime (requires Redis) |

See [Configuration reference](/guide/configuration-reference) for the full config map.

## Health checks

Scaffolded apps expose `GET /health` when `config/health.ts` is enabled. Point load balancer probes at `/health`.

## Related

- [Tutorial 4: Realtime & deploy](/tutorials/04-realtime-and-deploy)
- [Broadcasting](/guide/broadcasting) — WebSocket proxy headers
- [Upgrading to 1.0](/guide/upgrading-to-1.0)