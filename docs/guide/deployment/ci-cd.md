# CI/CD for Pondoknusa

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
      - run: npx pondoknusa config:cache
      - run: npx pondoknusa route:cache
      - run: npx pondoknusa view:cache
      - run: npx pondoknusa deploy:check
      # Platform-specific deploy step (Fly, Railway, Docker push, etc.)
```

Headless apps: omit `view:cache`.

## What to run where

| Step | Build time | Release / entrypoint | Every container start |
|------|------------|----------------------|------------------------|
| `npm ci` / `npm run build` | Yes | — | — |
| `pondoknusa config:cache` | Yes | Optional refresh | Rare |
| `pondoknusa route:cache` | Yes | Optional refresh | Rare |
| `pondoknusa view:cache` | Yes | — | — |
| `pondoknusa migrate` | — | **Yes** | Optional (see below) |
| `pondoknusa start` | — | — | Yes |
| `pondoknusa queue:work` | — | — | Separate process |

**Prefer running migrations once per release**, not on every replica start, when you run multiple containers. Use a release job or `fly deploy` hook; reserve entrypoint migrations for single-instance deploys.

## Environment promotion

| Stage | `APP_DEBUG` | Database | Notes |
|-------|-------------|----------|-------|
| Preview | `true` | Branch DB or ephemeral | Short TTL |
| Staging | `false` | Staging Postgres | Mirror production config |
| Production | `false` | Production Postgres | `deploy:check` required |

Store secrets in the platform vault (Fly secrets, Railway variables, GitHub Environments). Never commit `.env`.

## Perf budgets (optional)

Add to `pondoknusa.json`:

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
pondoknusa test --perf
```

Fails CI when benchmarks regress against your thresholds (requires benchmark harness in the repo).

## Docker image layers

Bake caches into the image so cold starts skip compile work:

```dockerfile
COPY . .
RUN npx pondoknusa config:cache \
 && npx pondoknusa route:cache \
 && npx pondoknusa view:cache
```

Rebuild the image when routes, config, or views change — not on every code-only change if caches are unchanged.

## Related

- [Deployment overview](/guide/deployment)
- [Docker](/guide/deployment/docker)
- [Performance](/guide/performance)
- [Benchmarks](/guide/benchmarks)