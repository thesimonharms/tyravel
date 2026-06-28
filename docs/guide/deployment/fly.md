# Deploy to Fly.io

Deploy a Tyravel app to [Fly.io](https://fly.io) with managed Postgres, optional Redis, and a release-phase migration.

## Prerequisites

- `flyctl` installed and authenticated
- A Tyravel app with Postgres: `tyravel new my-app --db=postgres --redis`
- `@tyravel/database-pg` and `@tyravel/redis-node` in `package.json`

## 1. Initialize Fly

```bash
cd my-app
fly launch --no-deploy
```

When prompted:

- **Region** — pick closest to users
- **Postgres** — yes (or attach later with `fly postgres create`)
- **Redis** — yes for WebSocket broadcast fan-out (or use Upstash)

## 2. Dockerfile

Use the same Dockerfile as [Docker](/guide/deployment/docker) or copy from `examples/hello-world/deploy/Dockerfile`.

## 3. fly.toml

```toml
app = "my-tyravel-app"
primary_region = "iad"

[build]

[env]
  NODE_ENV = "production"
  APP_DEBUG = "false"
  TYRAVEL_HOST = "0.0.0.0"
  TYRAVEL_PORT = "8080"
  DB_CONNECTION = "postgres"
  QUEUE_CONNECTION = "database"
  BROADCAST_CONNECTION = "websocket"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 1
  processes = ["app"]

  [http_service.concurrency]
    type = "requests"
    hard_limit = 250
    soft_limit = 200

  [[http_service.checks]]
    grace_period = "10s"
    interval = "30s"
    method = "GET"
    path = "/health"
    timeout = "5s"

[deploy]
  release_command = "node --experimental-strip-types node_modules/@tyravel/cli/dist/bin/tyravel.js migrate"

[[vm]]
  memory = "512mb"
  cpu_kind = "shared"
  cpus = 1

[processes]
  app = "./deploy/docker-entrypoint.sh"
  worker = "node --experimental-strip-types node_modules/@tyravel/cli/dist/bin/tyravel.js queue:work"
```

## 4. Secrets

```bash
fly secrets set \
  APP_URL="https://my-tyravel-app.fly.dev" \
  DB_HOST="my-tyravel-app-db.internal" \
  DB_DATABASE="my_tyravel_app" \
  DB_USERNAME="my_tyravel_app" \
  DB_PASSWORD="<from-fly-postgres>" \
  REDIS_URL="redis://default:<password>@<fly-redis>.upstash.io:6379"
```

Attach Fly Postgres and it injects `DATABASE_URL` — map it in `config/database.ts` or set `DB_*` secrets to match.

## 5. Pre-deploy caches

Run in your CI pipeline or locally before `fly deploy`:

```bash
tyravel route:cache
tyravel view:cache
```

Commit `bootstrap/cache/routes.json` and `storage/framework/views/*.json` **or** bake caches into the Docker image `RUN` layer (see Docker guide).

## 6. Deploy

```bash
fly deploy
```

Fly runs `release_command` (migrations) before switching traffic.

## 7. Queue worker

Scale the worker process:

```bash
fly scale count worker=1
```

Or deploy worker-only machines with `fly machine clone --process-group worker`.

## WebSocket on Fly

Fly's HTTP service handles WebSocket upgrades on the same port. Set `BROADCAST_CONNECTION=websocket` and ensure Redis is reachable for multi-machine fan-out.

If you use a custom domain, update `APP_URL` and Echo client config to match.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `CompiledViewCacheMissError` | Run `tyravel view:cache` in Docker build or release |
| Migrations fail on release | Check `DB_*` secrets and Postgres attachment |
| 502 on boot | Confirm `TYRAVEL_PORT=8080` matches `internal_port` |
| WS disconnects | Ensure `min_machines_running >= 1` or Redis pub/sub configured |

## Next

- [Broadcasting](/guide/broadcasting) — channel auth and nginx-style proxy notes
- [Docker](/guide/deployment/docker) — compose reference for local parity