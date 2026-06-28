# Deploy to Railway

Deploy a Tyravel app to [Railway](https://railway.app) using a Dockerfile or Nixpacks with managed Postgres.

## Prerequisites

- Railway account and CLI (optional)
- Tyravel app with Postgres: `tyravel new my-app --db=postgres`
- `@tyravel/database-pg` installed

## Option A — Dockerfile (recommended)

1. Copy deploy files from `examples/hello-world/deploy/`
2. Connect your GitHub repo in Railway
3. Railway detects `Dockerfile` and builds automatically

### Service variables

Set in the Railway dashboard (**Variables** tab):

::: v-pre
| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` |
| `TYRAVEL_HOST` | `0.0.0.0` |
| `TYRAVEL_PORT` | `${{PORT}}` |
| `DB_CONNECTION` | `postgres` |
| `DB_HOST` | `${{Postgres.PGHOST}}` |
| `DB_PORT` | `${{Postgres.PGPORT}}` |
| `DB_DATABASE` | `${{Postgres.PGDATABASE}}` |
| `DB_USERNAME` | `${{Postgres.PGUSER}}` |
| `DB_PASSWORD` | `${{Postgres.PGPASSWORD}}` |
| `QUEUE_CONNECTION` | `database` |
:::

Add a **Postgres** plugin; Railway exposes `PG*` variables you reference above.

### Pre-deploy command

In **Settings → Deploy → Pre-deploy command**:

```bash
npx tyravel migrate \
  && npx tyravel route:cache \
  && npx tyravel view:cache
```

### Start command

Leave empty to use Dockerfile `CMD`, or set explicitly:

```bash
./deploy/docker-entrypoint.sh
```

## Option B — railway.toml

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
preDeployCommand = "npx tyravel migrate"
startCommand = "./deploy/docker-entrypoint.sh"
healthcheckPath = "/health/ready"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
```

## Queue worker (second service)

1. Duplicate the service in Railway
2. Name it `worker`
3. **Start command:**

```bash
npx tyravel queue:work
```

4. Share the same Postgres variables; disable public networking on the worker.

## Redis + broadcasting (optional)

1. Add Railway **Redis** plugin (or Upstash Redis)
2. Set `REDIS_URL` / `REDIS_HOST` variables
3. Scaffold with `--redis` and `BROADCAST_CONNECTION=websocket`
4. Add `@tyravel/broadcasting-websocket` provider in `src/main.ts`

## Custom domain

1. **Settings → Networking → Custom domain**
2. Update `APP_URL` to `https://your-domain.com`
3. Redeploy so signed URLs and mail links resolve correctly

## Local parity

```bash
railway link
railway run npx tyravel start
```

Uses linked service variables against your local process.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Port binding error | Set `TYRAVEL_PORT` to Railway's `PORT` variable — Railway injects `PORT` at runtime |
| View cache miss | Add `view:cache` to pre-deploy command |
| DB connection refused | Confirm Postgres plugin is linked to the same service |
| Worker not processing | Deploy worker service; check `jobs` table |

## Next

- [Deployment overview](/guide/deployment) — shared checklist
- [Tutorial 4](/tutorials/04-realtime-and-deploy) — production task list