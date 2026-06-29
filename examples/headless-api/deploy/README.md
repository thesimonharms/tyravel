# Deploy manifests

Production Docker, Fly.io, and Railway files for this Pondoknusa app.

## Quick start (Docker Compose)

Requires Postgres — update `config/database.ts` and env vars if you scaffolded with SQLite.

```bash
docker compose -f deploy/docker-compose.yml up --build
```

## Commands

| Process | Command |
|---------|---------|
| Web | `npx pondoknusa start` |
| Worker | `npx pondoknusa queue:work` |
| Migrations | `npx pondoknusa migrate` |
| Warm caches | `npx pondoknusa config:cache && npx pondoknusa route:cache && npx pondoknusa view:cache` |

## Health probes

| Path | Purpose |
|------|---------|
| `/health/live` | Liveness — process is up |
| `/health/ready` | Readiness — database and optional Redis checks |
| `/health` | Alias for readiness |

See the [deployment guide](https://pondoknusa.dev/guide/deployment) for platform walkthroughs.

## Cloudflare (optional)

Mix-and-match Cloudflare modules (proxy, CDN, R2, Pages, tunnel): [deploy/cloudflare.md](./cloudflare.md).
