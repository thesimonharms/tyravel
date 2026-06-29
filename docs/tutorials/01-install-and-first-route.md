# 1. Install & first route

Create a Pondoknusa app, boot the HTTP kernel, and return your first HTML page.

## Create the project

```bash
npm create pondoknusa@latest blog
cd blog
npm install
```

The default scaffold uses SQLite, a database queue, and log mail — no Redis or cloud SDKs required.

## Project layout

Key files:

- `src/main.ts` — boots providers and the HTTP kernel
- `src/routes/web.ts` — web routes (or `routes/web.ts` depending on scaffold)
- `config/` — typed configuration modules
- `resources/views/` — `.tyr` templates

See [Application structure](/guide/application-structure) for the full map.

## First route

```typescript
import { Route, View } from '@pondoknusa/core';
import { Response } from '@pondoknusa/http';

Route.get('/', async () =>
  Response.html(await View.render('welcome', { title: 'Hello Pondoknusa' })),
);

Route.get('/health', async () => Response.json({ ok: true }));
```

Create the view:

```bash
pondoknusa make:view welcome
```

## Run the dev server

```bash
pondoknusa dev
```

`pondoknusa dev` starts the server with view, config, and route hot reload. Use `pondoknusa debug:watch` in a second terminal after `pondoknusa debug:install` to tail request timelines.

Visit `http://127.0.0.1:3000` and `/health`.

### Verified in CI

The [`examples/hello-world`](https://github.com/pondoknusa/pondoknusa/tree/main/examples/hello-world) reference app exercises this step. Its feature test asserts the welcome page contains `Hello Pondoknusa`:

```bash
cd examples/hello-world && npm test
```

## Named routes

```typescript
Route.get('/posts', async () => Response.json([])).name('posts.index');
```

List routes with `pondoknusa route:list` — filters and JSON output are documented in the [routing guide](/guide/routing).

## Next

Continue to [Auth & database](/tutorials/02-auth-and-database) to persist users and protect routes.