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

## Next steps

- [Application structure](./application-structure) — folders, providers, and config
- [Routing](./routing) — groups, middleware, and controllers
- [Database & ORM](./database) — models, migrations, and relationships