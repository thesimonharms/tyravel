# Tyravel Cloud (planned)

**Tyravel Cloud** is the planned managed hosting platform for Tyravel — the same relationship Vercel has to Next.js, or [Laravel Cloud](https://cloud.laravel.com) to Laravel. It does **not** exist yet; this page documents the target experience and what to use in the meantime.

## Vision

Deploy a Tyravel app with:

```bash
git push origin main
# → build, migrate, cache warm, health check, traffic
```

No Dockerfile authoring, no manual `view:cache` in CI, no guessing worker counts. Tyravel Cloud runs the same commands you run today (`config:cache`, `route:cache`, `view:cache`, `migrate`) as an automated release phase.

## Planned capabilities

| Area | Target |
|------|--------|
| **Deploy** | GitHub/GitLab integration, preview URLs per PR |
| **Runtime** | Managed Node 26+ processes with `tyravel start` / `--cluster` |
| **Database** | Managed Postgres with connection pooling |
| **Redis** | Managed Redis for cache, queue, broadcast fan-out |
| **Storage** | Cloudflare R2 by default (via `@tyravel/storage-r2`) |
| **CDN** | Cloudflare proxy + cache rules wired to Tyravel `ETag` middleware |
| **Workers** | Optional edge layer for headless JSON (future adapter) |
| **Observability** | Logs, metrics, `/health/ready` dashboards |
| **CLI** | `tyravel deploy`, `tyravel env`, `tyravel logs` |

## Design principles

1. **Same framework, zero fork** — Cloud runs stock Tyravel; no proprietary runtime lock-in.
2. **Batteries included** — Postgres, Redis, R2, and CDN configured from day one.
3. **Headless-first path** — smallest apps deploy fastest; SSR apps add view cache automatically.
4. **Escape hatch** — Every app remains portable to Docker/Fly/Railway via existing `deploy/` manifests.

## What to use today

Until Tyravel Cloud launches:

| Task | Today |
|------|-------|
| First production deploy | [Railway](/guide/deployment/railway) or [Fly.io](/guide/deployment/fly) |
| Container orchestration | [Docker](/guide/deployment/docker) |
| Cloudflare CDN + R2 | [Cloudflare guide](/guide/deployment/cloudflare) |
| Pre-deploy validation | `tyravel deploy:check` |
| CI release phase | [CI/CD guide](/guide/deployment/ci-cd) |
| Platform comparison | [Platform matrix](/guide/deployment/platforms) |

Example manifests ship in [`examples/hello-world/deploy/`](https://github.com/thesimonharms/tyravel/tree/main/examples/hello-world/deploy) and [`examples/headless-api/deploy/`](https://github.com/thesimonharms/tyravel/tree/main/examples/headless-api/deploy).

## `tyravel deploy:check` (available now)

Gate releases before traffic:

```bash
tyravel deploy:check
```

Runs doctor checks, route cache validation, and view compilation (skipped in headless mode). Tyravel Cloud will run an extended version of this suite on every deploy.

## Contributing to the platform

Tyravel Cloud will build on:

- Production boot profile (`prepareHttpServer`, config/route caches)
- Headless mode and JSON fast path
- `deploy:check` and health routes
- `@tyravel/storage-r2` for object storage
- Edge cache patterns from the [cookbook](/cookbook/edge-cache)

Watch the monorepo ROADMAP and release notes for Tyravel Cloud announcements.

## Related

- [Deployment overview](/guide/deployment)
- [Cloudflare](/guide/deployment/cloudflare)
- [Performance](/guide/performance)