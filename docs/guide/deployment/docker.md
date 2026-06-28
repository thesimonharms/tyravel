# Deploy with Docker

Containerize a Tyravel app for any orchestrator (Kubernetes, Nomad, a VPS) using the manifests in `examples/hello-world/deploy/`.

## Prerequisites

- Docker 24+
- A Tyravel app scaffolded with **Postgres** for production: `tyravel new my-app --db=postgres`
- `tyravel new` scaffolds `deploy/` automatically. Older apps can copy from `examples/hello-world/deploy/`.

## Dockerfile

```dockerfile
FROM node:26-bookworm-slim

WORKDIR /app

# Install Tyravel CLI for migrate/cache in entrypoint
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

COPY . .

ENV NODE_ENV=production
ENV TYRAVEL_HOST=0.0.0.0
ENV TYRAVEL_PORT=3000

RUN npx tyravel config:cache && npx tyravel route:cache && npx tyravel view:cache

EXPOSE 3000

CMD ["./deploy/docker-entrypoint.sh"]
```

Build:

```bash
docker build -t my-tyravel-app .
```

## Entrypoint

`deploy/docker-entrypoint.sh` runs migrations then starts the server:

```bash
#!/bin/sh
set -e

echo "Running migrations..."
npx tyravel migrate

echo "Starting Tyravel..."
exec npx tyravel start
```

Migrations run on every container start. For large fleets, run `tyravel migrate` once in a release job instead.

## Docker Compose (app + Postgres + worker)

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      APP_URL: http://localhost:3000
      APP_DEBUG: "false"
      TYRAVEL_HOST: 0.0.0.0
      TYRAVEL_PORT: "3000"
      DB_CONNECTION: postgres
      DB_HOST: postgres
      DB_PORT: "5432"
      DB_DATABASE: tyravel
      DB_USERNAME: tyravel
      DB_PASSWORD: tyravel
      QUEUE_CONNECTION: database
    depends_on:
      postgres:
        condition: service_healthy

  worker:
    build: .
    command: npx tyravel queue:work
    environment:
      NODE_ENV: production
      DB_CONNECTION: postgres
      DB_HOST: postgres
      DB_DATABASE: tyravel
      DB_USERNAME: tyravel
      DB_PASSWORD: tyravel
      QUEUE_CONNECTION: database
    depends_on:
      - app

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: tyravel
      POSTGRES_USER: tyravel
      POSTGRES_PASSWORD: tyravel
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U tyravel"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

Start:

```bash
docker compose up --build
```

Add a `redis` service and `--redis` app config when you need WebSocket broadcast fan-out across multiple app replicas.

## Production notes

- **Volumes** — persist `storage/` if using file cache or local disk storage
- **Secrets** — inject via Docker secrets or orchestrator env, not committed `.env`
- **WebSocket** — reverse-proxy must pass `Upgrade` and `Connection` headers for `/tyravel/ws`
- **Scale** — run one `worker` replica per queue throughput; scale `app` horizontally with Redis broadcast

## Next

- [Fly.io](/guide/deployment/fly) — managed Postgres on the same platform
- [Railway](/guide/deployment/railway) — plugin-based Postgres