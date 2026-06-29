# Headless API example

Reference Pondoknusa app for backend-only JSON APIs with personal access tokens, database queues, and deploy manifests.

## Quick start

```bash
cd examples/headless-api
npm install
pondoknusa migrate
pondoknusa dev
curl http://127.0.0.1:3000/api/v1/health
```

## Auth flow

1. Create a user (seed or register via migration/seeder).
2. Log in with JSON credentials:

```bash
curl -X POST http://127.0.0.1:3000/api/v1/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"secret"}'
```

3. Create a personal access token (session required after login):

```bash
curl -X POST http://127.0.0.1:3000/api/v1/tokens \
  -H 'Content-Type: application/json' \
  -d '{"name":"ci-token"}'
```

4. Call protected routes with the token:

```bash
curl http://127.0.0.1:3000/api/v1/me \
  -H 'Authorization: Bearer tyr_...'
```

## Queue worker

```bash
pondoknusa dev              # web + queue worker together
# or
npm run dev:worker       # worker only
```

## Scaffold your own

```bash
npm create pondoknusa@latest my-api -- --headless --auth
cd my-api
pondoknusa migrate
pondoknusa auth:install     # if not included at scaffold time
pondoknusa dev
```

## OpenAPI stub

```bash
pondoknusa make:openapi
cat storage/api/openapi.json
```

## Pre-deploy

```bash
pondoknusa route:cache
pondoknusa deploy:check
```

Production boots warm `storage/framework/routes.json` automatically via `prepareHttpServer()`.

See [Headless API guide](https://pondoknusa.dev/guide/headless) and `deploy/README.md`.