# CI/CD for Tyravel

Automate build, cache warm-up, migrations, and deploy gates so production boots are fast and predictable.

## Release pipeline (recommended)

```mermaid
flowchart TD
  Push[git push] --> CI[CI: test + build]
  CI --> Cache[config/route/view cache]
  Cache --> Image[Build container image]
  Image --> Migrate[Release: migrate]
  Migrate --> Deploy[Rolling deploy]
  Deploy --> Health[/health/ready]
```

### Minimal GitHub Actions example

```yaml
name: Release

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 26
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 26
      - run: npm ci
      - run: npm run build
      # Warm caches into the artifact / image layer
      - run: npx tyravel config:cache
      - run: npx tyravel route:cache
      - run: npx tyravel view:cache
      - run: npx tyravel deploy:check
      # Platform-specific deploy step (Fly, Railway, Docker push, etc.)
```

Headless apps: omit `view:cache`.

## What to run where

| Step | Build time | Release / entrypoint | Every container start |
|------|------------|----------------------|------------------------|
| `npm ci` / `npm run build` | Yes | — | — |
| `tyravel config:cache` | Yes | Optional refresh | Rare |
| `tyravel route:cache` | Yes | Optional refresh | Rare |
| `tyravel view:cache` | Yes | — | — |
| `tyravel migrate` | — | **Yes** | Optional (see below) |
| `tyravel start` | — | — | Yes |
| `tyravel queue:work` | — | — | Separate process |

**Prefer running migrations once per release**, not on every replica start, when you run multiple containers. Use a release job or `fly deploy` hook; reserve entrypoint migrations for single-instance deploys.

## Environment promotion

| Stage | `APP_DEBUG` | Database | Notes |
|-------|-------------|----------|-------|
| Preview | `true` | Branch DB or ephemeral | Short TTL |
| Staging | `false` | Staging Postgres | Mirror production config |
| Production | `false` | Production Postgres | `deploy:check` required |

Store secrets in the platform vault (Fly secrets, Railway variables, GitHub Environments). Never commit `.env`.

## Perf budgets (optional)

Add to `tyravel.json`:

```json
{
  "perf": {
    "budgets": {
      "http.json": { "min": 400, "unit": "req/s" },
      "boot.cold": { "max": 500, "unit": "ms" }
    }
  }
}
```

```bash
tyravel test --perf
```

Fails CI when benchmarks regress against your thresholds (requires benchmark harness in the repo).

## Docker image layers

Bake caches into the image so cold starts skip compile work:

```dockerfile
COPY . .
RUN npx tyravel config:cache \
 && npx tyravel route:cache \
 && npx tyravel view:cache
```

Rebuild the image when routes, config, or views change — not on every code-only change if caches are unchanged.

## Related

- [Deployment overview](/guide/deployment)
- [Docker](/guide/deployment/docker)
- [Performance](/guide/performance)
- [Benchmarks](/guide/benchmarks)