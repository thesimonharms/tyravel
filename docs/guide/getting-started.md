# Getting started

## Create a new application

```bash
npx pondoknusa new my-app
cd my-app
npm install
pondoknusa serve
```

Visit `http://127.0.0.1:3000`.

### Backend-only (headless API)

For JSON APIs without views, SSR, or client assets:

```bash
npm create pondoknusa@latest my-api -- --headless
cd my-api
npm install
pondoknusa migrate
pondoknusa dev
curl http://127.0.0.1:3000/api/v1/health
```

See the [Headless API guide](./headless) and `examples/headless-api` in the repo.

## Run from the monorepo

If you are developing Pondoknusa itself, build the workspace first:

```bash
npm install
npm run build
```

Then try the reference apps:

```bash
cd examples/hello-world
npm install
pondoknusa serve
```

```bash
cd examples/headless-api
npm install
pondoknusa migrate
pondoknusa dev
```

## Application entry point

Every app boots through `src/main.ts`:

```typescript
import { Application, ConfigServiceProvider, Route, serve } from '@pondoknusa/core';
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
pondoknusa list                    # Available commands
pondoknusa serve                   # Dev server (reads pondoknusa.json)
pondoknusa migrate                 # Run migrations
pondoknusa make:controller User    # Generate a controller
pondoknusa make:model Post         # Generate a model
pondoknusa auth:install            # Scaffold auth (User, routes, migrations)
```

## Deploy to production

When you are ready to ship:

1. Read the [deployment overview](./deployment) — checklist, process model, health probes
2. Pick a host via the [platform matrix](./deployment/platforms) (Railway, Fly, Docker, or Cloudflare + origin)
3. Automate releases with [CI/CD](./deployment/ci-cd)

```bash
pondoknusa deploy:check   # doctor + route/view validation before traffic
```

Managed **Pondoknusa Cloud** (git-push deploy) is planned — see [Pondoknusa Cloud](./deployment/pondoknusa-cloud). Until then, copy manifests from `examples/hello-world/deploy/`.

## Deploy to production

| Step | Guide |
|------|-------|
| Pick a platform | [Platform matrix](/guide/deployment/platforms) |
| Fastest path | [Railway](/guide/deployment/railway) or [Fly.io](/guide/deployment/fly) |
| Cloudflare CDN + R2 | [Cloudflare](/guide/deployment/cloudflare) (Node origin required today) |
| Automate releases | [CI/CD](/guide/deployment/ci-cd) |

```bash
pondoknusa migrate
pondoknusa config:cache && pondoknusa route:cache && pondoknusa view:cache
pondoknusa deploy:check
pondoknusa start
```

Full checklist: [Deployment](/guide/deployment). Managed Pondoknusa hosting is planned as [Pondoknusa Cloud](/guide/deployment/pondoknusa-cloud).

## Next steps

- [Application structure](./application-structure) — folders, providers, and config
- [Routing](./routing) — groups, middleware, and controllers
- [Database & ORM](./database) — models, migrations, and relationships
- [Performance](/guide/performance) — production speed defaults
- [Performance](./performance) — production speed defaults