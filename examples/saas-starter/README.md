# SaaS starter

Forkable Pondoknusa app scaffold for auth, dashboard routes, queues, and deploy manifests. The fastest path is to generate a fresh project:

```bash
npm create pondoknusa@latest my-saas -- --template=saas --auth
cd my-saas
pondoknusa migrate
pondoknusa auth:install
pondoknusa dev --queue
```

## What the `saas` template includes

- SSR welcome page with dashboard JSON route stub
- Auth dependency pre-installed (`pondoknusa auth:install` scaffolds guards and OAuth routes)
- Database queue connection and `dev:worker` script
- `deploy/` directory (Docker, Compose, Fly, Railway)
- `.github/workflows/view-types.yml` for prop drift checks
- `pondoknusa test` and `precommit` (`pondoknusa view:lint`) scripts

## Reference implementations

| Feature | See |
|---------|-----|
| Full auth + OAuth + policies | `examples/hello-world` |
| Admin UI | `pondoknusa admin:install` after auth |
| RAG / AI stack | `examples/rag` |
| Production deploy | `deploy/README.md` in any scaffold |

## Pre-deploy

```bash
pondoknusa doctor
pondoknusa deploy:check
pondoknusa view:cache
pondoknusa route:cache
```

Migrate from Laravel? See [Migrating from Laravel](https://pondoknusa.dev/guide/migrating-from-laravel).