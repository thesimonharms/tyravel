export function dockerignore(): string {
  return `node_modules
.git
.env
.env.*
!.env.example
storage/logs/*
storage/framework/cache/*
coverage
tests
*.md
`;
}

export function dockerEntrypoint(): string {
  return `#!/bin/sh
set -e

echo "Running migrations..."
npx tyravel migrate

echo "Starting Tyravel..."
exec npx tyravel start
`;
}

export function dockerfile(): string {
  return `FROM node:26-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

COPY . .

ENV NODE_ENV=production
ENV TYRAVEL_HOST=0.0.0.0
ENV TYRAVEL_PORT=3000

RUN npx tyravel config:cache && npx tyravel route:cache && npx tyravel view:cache

EXPOSE 3000

CMD ["./deploy/docker-entrypoint.sh"]
`;
}

export function dockerCompose(): string {
  return `services:
  app:
    build:
      context: ..
      dockerfile: deploy/Dockerfile
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
    healthcheck:
      test:
        [
          "CMD",
          "node",
          "-e",
          "fetch('http://127.0.0.1:3000/health/ready').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))",
        ]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s

  worker:
    build:
      context: ..
      dockerfile: deploy/Dockerfile
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
      app:
        condition: service_healthy

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
`;
}

export function flyToml(appName: string): string {
  return `app = "${appName}"
primary_region = "iad"

[build]

[env]
  NODE_ENV = "production"
  APP_DEBUG = "false"
  TYRAVEL_HOST = "0.0.0.0"
  TYRAVEL_PORT = "8080"
  DB_CONNECTION = "postgres"
  QUEUE_CONNECTION = "database"
  BROADCAST_CONNECTION = "log"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 1
  processes = ["app"]

  [http_service.concurrency]
    type = "requests"
    hard_limit = 250
    soft_limit = 200

  [[http_service.checks]]
    grace_period = "10s"
    interval = "30s"
    method = "GET"
    path = "/health/ready"
    timeout = "5s"

[deploy]
  release_command = "npx tyravel migrate"

[[vm]]
  memory = "512mb"
  cpu_kind = "shared"
  cpus = 1

[processes]
  app = "./deploy/docker-entrypoint.sh"
  worker = "npx tyravel queue:work"
`;
}

export function railwayToml(): string {
  return `[build]
builder = "DOCKERFILE"
dockerfilePath = "deploy/Dockerfile"

[deploy]
preDeployCommand = "npx tyravel migrate"
startCommand = "./deploy/docker-entrypoint.sh"
healthcheckPath = "/health/ready"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
`;
}

export function deployReadme(): string {
  return `# Deploy manifests

Production Docker, Fly.io, and Railway files for this Tyravel app.

## Quick start (Docker Compose)

Requires Postgres — update \`config/database.ts\` and env vars if you scaffolded with SQLite.

\`\`\`bash
docker compose -f deploy/docker-compose.yml up --build
\`\`\`

## Commands

| Process | Command |
|---------|---------|
| Web | \`npx tyravel start\` |
| Worker | \`npx tyravel queue:work\` |
| Migrations | \`npx tyravel migrate\` |
| Warm caches | \`npx tyravel config:cache && npx tyravel route:cache && npx tyravel view:cache\` |

## Health probes

| Path | Purpose |
|------|---------|
| \`/health/live\` | Liveness — process is up |
| \`/health/ready\` | Readiness — database and optional Redis checks |
| \`/health\` | Alias for readiness |

See the [deployment guide](https://tyravel.dev/guide/deployment) for platform walkthroughs.
`;
}