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

## Cloudflare (optional)

Modular recipes for mixing Cloudflare products with your Node origin: [deploy/cloudflare.md](./cloudflare.md).
`;
}

export function deployCloudflareMd(): string {
  return `# Cloudflare (modular)

Use only the modules you need. Tyravel **1.x** runs on **Node.js** (Fly, Railway, Docker, or a VPS) — Cloudflare products sit in front of or beside that origin. Full Tyravel on **Workers** is not supported yet.

Full docs: [tyravel.dev/guide/deployment/cloudflare](https://tyravel.dev/guide/deployment/cloudflare)

## Pick your modules

| I want… | Module | Needs origin? |
|---------|--------|---------------|
| TLS, DDoS, hide origin IP | [DNS + proxy](#module-1-dns--proxy) | Yes |
| Cache public HTML/API at the edge | [CDN + cache rules](#module-2-cdn--edge-cache) | Yes (usually with Module 1) |
| File uploads / S3-compatible storage | [R2 storage](#module-3-r2-object-storage) | Yes (uploads from Node) |
| Host Vite/client build output | [Pages (static)](#module-4-pages-static-assets) | API/SSR elsewhere |
| Share staging without opening ports | [Tunnel](#module-5-tunnel-previews) | Yes (local or remote) |
| Bot protection, rate limits | [WAF + security](#module-6-waf--security) | Yes (usually with Module 1) |

**Origin** — deploy Tyravel with the manifests in this folder (\`fly.toml\`, \`railway.toml\`, \`docker-compose.yml\`) before enabling proxy or CDN modules.

## Common combinations

| Stack | Modules |
|-------|---------|
| CDN in front of monolith | 1 + 2 |
| API + R2 uploads | 1 + 3 |
| SPA on Pages, API on Fly | 1 + 4 (+ 3 optional) |
| Production Fly + staging tunnel | 1 + 2 + 5 |
| Hardened public API | 1 + 2 + 6 |

---

## Module 1: DNS + proxy

**When:** Custom domain, free TLS, DDoS protection, orange-cloud hiding of origin IP.

**Prerequisites:** Tyravel running on a host with a public hostname (see \`fly.toml\` / \`railway.toml\` / Docker).

1. Add the domain in Cloudflare **DNS**.
2. Create a **proxied** (orange cloud) record:
   - **CNAME** \`@\` or \`www\` → your Fly/Railway hostname, or
   - **A/AAAA** → origin IP (VPS/Docker).
3. **SSL/TLS** → **Full (strict)** (origin must serve valid HTTPS).
4. Set origin env:

\`\`\`bash
APP_URL=https://your-domain.example
TYRAVEL_HOST=0.0.0.0
SESSION_SECURE=true
\`\`\`

Use \`TRUST_PROXY=true\` if your app reads \`X-Forwarded-*\` for client IP or scheme.

**WebSockets:** Proxy passes upgrades through by default. Broadcasting still terminates on the Node origin; use Redis fan-out when running multiple instances.

**This module alone:** Enough for TLS + DDoS without edge caching.

---

## Module 2: CDN + edge cache

**When:** Repeat traffic to public, cacheable \`GET\` routes (blog posts, marketing pages, versioned assets).

**Prerequisites:** [Module 1](#module-1-dns--proxy) (or another CDN in front of the same origin).

### App: HTTP cache middleware

\`\`\`typescript
import { createHttpCacheMiddleware } from '@tyravel/http';

Route.get('/posts/:slug', showPost, {
  middleware: [createHttpCacheMiddleware({ maxAge: 300 })],
});
\`\`\`

### Cloudflare: cache rules

1. **Caching** → enable **Origin Cache Control**.
2. **Cache Rules** → cache public \`GET\` paths, e.g.:

\`\`\`
(http.request.method eq "GET" and starts_with(http.request.uri.path, "/posts/"))
\`\`\`

3. Add a **bypass** rule for authenticated areas (\`/dashboard/*\`, \`/api/me\`, anything setting \`Set-Cookie\`).
4. Optional: enable **Tiered Cache** for global audiences.

| Route | Edge cache? |
|-------|-------------|
| Public HTML / JSON | Yes — short \`max-age\` + ETag |
| Dashboard / session HTML | **Bypass** |
| \`/build/*\` fingerprinted assets | Yes — long \`max-age\` |
| WebSocket upgrade | **Bypass** (automatic) |

More examples: [edge cache cookbook](https://tyravel.dev/cookbook/edge-cache).

**Skip this module** if every route is personalized or you only need TLS (Module 1).

---

## Module 3: R2 object storage

**When:** User uploads, exports, or static files in object storage — independent of CDN/proxy.

**Prerequisites:** Node origin (uploads use the S3-compatible API from Tyravel). Works **without** Module 1.

\`\`\`bash
npm install @tyravel/storage-r2
\`\`\`

\`\`\`typescript
// config/storage.ts
export default {
  default: 'r2',
  disks: {
    r2: {
      driver: 'r2',
      bucket: env('R2_BUCKET', 'tyravel'),
      endpoint: env('R2_ENDPOINT'), // https://<account>.r2.cloudflarestorage.com
      accessKeyId: env('R2_ACCESS_KEY_ID'),
      secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
      publicUrl: env('R2_PUBLIC_URL'), // optional custom domain or r2.dev
    },
  },
} satisfies StorageConfig;
\`\`\`

\`\`\`typescript
// src/main.ts
import { R2StorageServiceProvider } from '@tyravel/storage-r2';

app.register(R2StorageServiceProvider);
\`\`\`

Origin env:

\`\`\`bash
R2_BUCKET=tyravel
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_PUBLIC_URL=https://files.your-domain.example  # optional
\`\`\`

Create an R2 API token with Object Read & Write on the bucket. Configure bucket CORS if browsers upload directly.

**This module alone:** Storage only — no Cloudflare proxy required.

---

## Module 4: Pages (static assets)

**When:** UI is a Vite/React/Vue SPA; Tyravel serves API and/or SSR on a subdomain.

**Prerequisites:** Separate Node deploy for API/SSR (this folder’s Fly/Railway/Docker manifests).

| Host | Serves |
|------|--------|
| \`www.example.com\` (Pages) | \`dist/\` / Vite client build |
| \`api.example.com\` (Node) | Tyravel headless or full stack |

1. Connect the Pages project to your Git repo (or \`wrangler pages deploy dist\`).
2. Build command: \`npm run build\` (client only).
3. Point \`api.example.com\` DNS (Module 1) at the Tyravel origin.
4. Set client env \`VITE_API_URL=https://api.example.com\`.

**Origin rules (optional):** Serve \`/build/*\` from Pages and proxy everything else to Node on one hostname — more complex; subdomain split is simpler.

**Headless API:** Ideal pairing — skip \`view:cache\` on the API origin.

---

## Module 5: Tunnel (previews)

**When:** Staging, PR previews, or local demos without public ingress.

**Prerequisites:** Tyravel listening locally or on a private host (\`tyravel start\` / \`tyravel dev\`).

Quick tunnel (no account):

\`\`\`bash
cloudflared tunnel --url http://127.0.0.1:3000
\`\`\`

Named tunnel (persistent hostname):

\`\`\`bash
cloudflared tunnel create tyravel-staging
cloudflared tunnel route dns tyravel-staging staging.example.com
cloudflared tunnel run tyravel-staging
\`\`\`

Set \`APP_URL\` to the tunnel hostname. Not a replacement for production origin hosting — use Module 1 for production.

---

## Module 6: WAF + security

**When:** Public API or SSR behind Module 1; bot traffic, geo rules, or rate limits.

**Prerequisites:** [Module 1](#module-1-dns--proxy).

Examples (enable as needed):

- **WAF** managed rulesets on the zone.
- **Rate limiting** on \`/api/*\` or login routes.
- **Bot Fight Mode** / Super Bot Fight (may affect legitimate API clients — test first).
- Disable **Rocket Loader** on paths that use WebSockets or strict CSP.

Pair with Tyravel auth throttling and \`APP_DEBUG=false\` on the origin.

---

## Not supported on Cloudflare (1.x)

| Product | Status |
|---------|--------|
| **Workers** (full Tyravel) | Roadmap — needs HTTP kernel + boot adapter |
| **D1** | Use Postgres/MySQL on origin |
| **Cloudflare Queues** | Use \`tyravel queue:work\` on origin |

Headless JSON on Workers + Hyperdrive is planned; track [ROADMAP](https://github.com/thesimonharms/tyravel/blob/main/ROADMAP.md).

---

## Troubleshooting by module

| Module | Symptom | Fix |
|--------|---------|-----|
| 1 | Redirect loop | SSL **Full (strict)**; origin HTTPS valid |
| 1 | Wrong client IP | \`TRUST_PROXY=true\`; check \`CF-Connecting-IP\` |
| 2 | Stale HTML | Shorter \`max-age\`; bypass auth routes; ETag middleware |
| 2 | Session lost | Bypass cache on \`Set-Cookie\` routes; \`SESSION_SECURE=true\` |
| 3 | R2 403 | Token permissions; bucket CORS |
| 4 | CORS errors | API allows Pages origin; correct \`VITE_API_URL\` |
| 5 | Tunnel 502 | Origin on \`127.0.0.1:3000\`; \`TYRAVEL_HOST=0.0.0.0\` |
| 6 | WS drops | Bypass Rocket Loader; confirm origin upgrade |

---

## Related

- [deploy/README.md](./README.md) — Docker, Fly, Railway
- [Deployment guide](https://tyravel.dev/guide/deployment)
- [Storage (R2)](https://tyravel.dev/guide/storage)
`;
}