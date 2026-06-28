# Getting started

## Create a new application

```bash
npx tyravel new my-app
cd my-app
npm install
tyravel serve
```

Visit `http://127.0.0.1:3000`.

### Backend-only (headless API)

For JSON APIs without views, SSR, or client assets:

```bash
npm create tyravel@latest my-api -- --headless
cd my-api
npm install
tyravel migrate
tyravel dev
curl http://127.0.0.1:3000/api/v1/health
```

See the [Headless API guide](./headless) and `examples/headless-api` in the repo.

## Run from the monorepo

If you are developing Tyravel itself, build the workspace first:

```bash
npm install
npm run build
```

Then try the reference apps:

```bash
cd examples/hello-world
npm install
tyravel serve
```

```bash
cd examples/headless-api
npm install
tyravel migrate
tyravel dev
```

## Application entry point

Every app boots through `src/main.ts`:

```typescript
import { Application, ConfigServiceProvider, Route, serve } from '@tyravel/core';
import { AppServiceProvider } from './providers/app-service-provider.js';
import './routes/web.js';

const app = new Application();
app.register(ConfigServiceProvider);
app.register(AppServiceProvider);
await app.boot();

serve(app);
```

Routes are registered in `src/routes/web.ts` using the `Route` facade after `setRouteApplication(app)` is called from your provider.

## CLI essentials

```bash
tyravel list                    # Available commands
tyravel serve                   # Dev server (reads tyravel.json)
tyravel migrate                 # Run migrations
tyravel make:controller User    # Generate a controller
tyravel make:model Post         # Generate a model
tyravel auth:install            # Scaffold auth (User, routes, migrations)
```

## Deploy to production

When you are ready to ship:

1. Read the [deployment overview](./deployment) — checklist, process model, health probes
2. Pick a host via the [platform matrix](./deployment/platforms) (Railway, Fly, Docker, or Cloudflare + origin)
3. Automate releases with [CI/CD](./deployment/ci-cd)

```bash
tyravel deploy:check   # doctor + route/view validation before traffic
```

Managed **Tyravel Cloud** (git-push deploy) is planned — see [Tyravel Cloud](./deployment/tyravel-cloud). Until then, copy manifests from `examples/hello-world/deploy/`.

## Deploy to production

| Step | Guide |
|------|-------|
| Pick a platform | [Platform matrix](/guide/deployment/platforms) |
| Fastest path | [Railway](/guide/deployment/railway) or [Fly.io](/guide/deployment/fly) |
| Cloudflare CDN + R2 | [Cloudflare](/guide/deployment/cloudflare) (Node origin required today) |
| Automate releases | [CI/CD](/guide/deployment/ci-cd) |

```bash
tyravel migrate
tyravel config:cache && tyravel route:cache && tyravel view:cache
tyravel deploy:check
tyravel start
```

Full checklist: [Deployment](/guide/deployment). Managed Tyravel hosting is planned as [Tyravel Cloud](/guide/deployment/tyravel-cloud).

## Next steps

- [Application structure](./application-structure) — folders, providers, and config
- [Routing](./routing) — groups, middleware, and controllers
- [Database & ORM](./database) — models, migrations, and relationships
- [Performance](/guide/performance) — production speed defaults
- [Performance](./performance) — production speed defaults