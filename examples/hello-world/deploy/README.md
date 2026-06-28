# Deploy manifests

Copy-paste production files for Tyravel apps. See the [deployment guides](https://tyravel.dev/guide/deployment) for full walkthroughs.

New apps scaffolded with `tyravel new` already include this `deploy/` directory.

## Try with hello-world (monorepo)

```bash
cd examples/hello-world
docker compose -f deploy/docker-compose.yml up --build
```

## Commands

| Process | Command |
|---------|---------|
| Web | `npx tyravel start` |
| Worker | `npx tyravel queue:work` |
| Migrations | `npx tyravel migrate` |
| Warm caches | `npx tyravel config:cache && npx tyravel route:cache && npx tyravel view:cache` |

Ensure `@tyravel/cli` and your database driver (e.g. `@tyravel/database-pg`) are in `dependencies`, not only `devDependencies`.

## Cloudflare (optional)

Mix-and-match Cloudflare modules (proxy, CDN, R2, Pages, tunnel): [deploy/cloudflare.md](./cloudflare.md).