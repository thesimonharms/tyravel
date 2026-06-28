# create-tyravel

Scaffold a new Tyravel application via `npm create`.

## Usage

```bash
npm create tyravel@latest my-app
```

### Headless API (backend only)

```bash
npm create tyravel@latest my-api -- --headless
```

Adds a slim dependency set, `src/routes/api.ts`, and headless-aware tooling (`doctor`, `deploy:check`, `tyravel dev`).

### Templates

```bash
npm create tyravel@latest my-app -- --template=api
npm create tyravel@latest my-saas -- --template=saas --auth
npm create tyravel@latest my-api -- --template=headless
```

### Options

Pass any `tyravel new` flag after `--`:

```bash
npm create tyravel@latest my-app -- --db=postgres --redis --queue=redis
npm create tyravel@latest my-api -- --headless --no-auth
```

Run `npx tyravel new --help` (via the CLI) for the full flag list.

## Docs

- [Getting started](https://tyravel.dev/guide/getting-started)
- [Headless API](https://tyravel.dev/guide/headless)