# Deploy with Docker

Containerize a Pondoknusa app for any orchestrator (Kubernetes, Nomad, a VPS) using the manifests in `examples/hello-world/deploy/`.

## Prerequisites

- Docker 24+
- A Pondoknusa app scaffolded with **Postgres** for production: `pondoknusa new my-app --db=postgres`
- `pondoknusa new` scaffolds `deploy/` automatically. Older apps can copy from `examples/hello-world/deploy/`.

## Dockerfile

```dockerfile
FROM node:26-bookworm-slim

WORKDIR /app

# Install Pondoknusa CLI for migrate/cache in entrypoint
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

COPY . .

ENV NODE_ENV=production
ENV PONDOKNUSA_HOST=0.0.0.0
ENV PONDOKNUSA_PORT=3000

RUN npx pondoknusa config:cache && npx pondoknusa route:cache && npx pondoknusa view:cache

EXPOSE 3000

CMD ["./deploy/docker-entrypoint.sh"]
```

Build:

```bash
docker build -t my-pondoknusa-app .
```

## Entrypoint

`deploy/docker-entrypoint.sh` runs migrations then starts the server:

```bash
#!/bin/sh
set -e

echo "Running migrations..."
npx pondoknusa migrate

echo "Starting Pondoknusa..."
exec npx pondoknusa start
```

Migrations run on every container start. For large fleets, run `pondoknusa migrate` once in a release job instead.

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
      PONDOKNUSA_HOST: 0.0.0.0
      PONDOKNUSA_PORT: "3000"
      DB_CONNECTION: postgres
      DB_HOST: postgres
      DB_PORT: "5432"
      DB_DATABASE: pondoknusa
      DB_USERNAME: pondoknusa
      DB_PASSWORD: pondoknusa
      QUEUE_CONNECTION: database
    depends_on:
      postgres:
        condition: service_healthy

  worker:
    build: .
    command: npx pondoknusa queue:work
    environment:
      NODE_ENV: production
      DB_CONNECTION: postgres
      DB_HOST: postgres
      DB_DATABASE: pondoknusa
      DB_USERNAME: pondoknusa
      DB_PASSWORD: pondoknusa
      QUEUE_CONNECTION: database
    depends_on:
      - app

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: pondoknusa
      POSTGRES_USER: pondoknusa
      POSTGRES_PASSWORD: pondoknusa
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pondoknusa"]
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
- **WebSocket** — reverse-proxy must pass `Upgrade` and `Connection` headers for `/pondoknusa/ws`
- **Scale** — run one `worker` replica per queue throughput; scale `app` horizontally with Redis broadcast

## Next

- [Platform matrix](/guide/deployment/platforms) — compare hosting options
- [Cloudflare](/guide/deployment/cloudflare) — CDN + R2 in front of Docker origin
- [CI/CD](/guide/deployment/ci-cd) — automate image build and release
- [Fly.io](/guide/deployment/fly) — managed Postgres on the same platform
- [Railway](/guide/deployment/railway) — plugin-based Postgres