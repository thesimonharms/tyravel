# Deployment platform matrix

Choose a runtime based on what your app needs. Tyravel **1.x** targets **Node.js 26+** (or Bun) as the primary production runtime. Edge runtimes are supported for **partial** workloads today; a first-class edge adapter is on the roadmap.

## Quick picker

| You need… | Start here |
|-----------|------------|
| Fastest path to production | [Railway](/guide/deployment/railway) |
| Global regions + managed Postgres | [Fly.io](/guide/deployment/fly) |
| Full control / Kubernetes | [Docker](/guide/deployment/docker) |
| Cloudflare CDN + R2 in front of Node | [Cloudflare](/guide/deployment/cloudflare) |
| JSON API only, smallest boot | [Headless API](/guide/headless) on any Node host |
| Future: git-push managed hosting | [Tyravel Cloud](/guide/deployment/tyravel-cloud) (planned) |

## Feature matrix

| Capability | Docker / VPS | Fly / Railway | Cloudflare (edge) | Tyravel Cloud (planned) |
|------------|----------------|---------------|-------------------|-------------------------|
| Full Tyravel (SSR + API + queues) | Yes | Yes | Partial — origin required | Yes |
| `tyravel start --cluster` | Yes | Yes | No | Yes |
| Postgres / MySQL | Yes | Yes (managed) | Via Hyperdrive to remote DB | Managed |
| Redis (cache, queue, broadcast) | Yes | Yes | KV alternative for cache only | Managed |
| WebSocket broadcasting | Yes | Yes (with Redis) | Not on Workers today | Yes |
| `queue:work` long-running | Yes | Yes (separate process) | No — use origin cron | Managed worker |
| `view:cache` on deploy | Yes | Yes | Pre-build in CI, serve from origin | Automatic |
| File storage | Local / S3 / **R2** | R2 / S3 | **R2** native | R2 / object store |
| Edge HTML cache (ETag) | Via CDN | Via CDN | **Native** | Built-in |

## App shape → hosting pattern

### Full-stack SSR (default scaffold)

```
Browser → CDN (optional) → Node (tyravel start) → Postgres
                              ↳ queue worker
                              ↳ scheduler cron
```

Best on Docker, Fly, or Railway. Put [Cloudflare](/guide/deployment/cloudflare) in front for TLS, DDoS, and cacheable GET routes.

### Headless API

```
Client / mobile → CDN (optional) → Node (headless) → Postgres
                                       ↳ queue worker
```

Skip `view:cache`. Smaller image, faster boot. Same Node hosts apply.

### Split: API + static front-end

```
Browser → Cloudflare Pages (static SPA)
       → Cloudflare proxy → Node Tyravel API (Fly/Railway)
       → R2 (uploads)
```

Common when the UI is Vite/React and the API is `tyravel new --headless`.

### Split: SSR origin + Cloudflare edge

```
Browser → Cloudflare (proxy, cache rules, WAF)
       → Node origin (SSR + API)
       → Postgres + Redis
       → R2 (optional storage disk)
```

Recommended Cloudflare pattern until a Workers adapter ships. See the [edge cache cookbook](/cookbook/edge-cache).

## Process checklist (all Node platforms)

Every production deploy should run:

```bash
tyravel migrate
tyravel config:cache
tyravel route:cache
tyravel view:cache    # skip for headless
tyravel deploy:check  # optional gate before traffic
```

See [CI/CD](/guide/deployment/ci-cd) for pipeline examples.

## Related

- [Deployment overview](/guide/deployment)
- [Performance](/guide/performance) — boot profile, pools, clustering
- [Observability cookbook](/cookbook/observability) — health probes