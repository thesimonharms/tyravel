# Deploy manifests

Copy-paste production files for Tyravel apps. See the [deployment guides](https://tyravel.dev/guide/deployment) for full walkthroughs.

## Copy into your app

From your app root (after `tyravel new`):

```bash
cp deploy/Dockerfile deploy/docker-compose.yml deploy/fly.toml deploy/railway.toml ./
mkdir -p deploy
cp path/to/tyravel/examples/hello-world/deploy/docker-entrypoint.sh deploy/
cp path/to/tyravel/examples/hello-world/deploy/.dockerignore ./
chmod +x deploy/docker-entrypoint.sh
```

Ensure `@tyravel/cli` and your database driver (e.g. `@tyravel/database-pg`) are in `dependencies`, not only `devDependencies`.

## Try with hello-world (monorepo)

```bash
cd examples/hello-world
docker compose -f deploy/docker-compose.yml up --build
```