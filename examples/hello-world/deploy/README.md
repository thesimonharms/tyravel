# Deploy manifests

Copy-paste production files for Pondoknusa apps. See the [deployment guides](https://pondoknusa.dev/guide/deployment) for full walkthroughs.

New apps scaffolded with `pondoknusa new` already include this `deploy/` directory.

## Try with hello-world (monorepo)

```bash
cd examples/hello-world
docker compose -f deploy/docker-compose.yml up --build
```

## Commands

| Process | Command |
|---------|---------|
| Web | `npx pondoknusa start` |
| Worker | `npx pondoknusa queue:work` |
| Migrations | `npx pondoknusa migrate` |
| Warm caches | `npx pondoknusa config:cache && npx pondoknusa route:cache && npx pondoknusa view:cache` |

Ensure `@pondoknusa/cli` and your database driver (e.g. `@pondoknusa/database-pg`) are in `dependencies`, not only `devDependencies`.

## Cloudflare (optional)

Mix-and-match Cloudflare modules (proxy, CDN, R2, Pages, tunnel): [deploy/cloudflare.md](./cloudflare.md).