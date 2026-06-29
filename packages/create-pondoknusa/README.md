# create-pondoknusa

Scaffold a new Pondoknusa application via `npm create`.

## Usage

```bash
npm create pondoknusa@latest my-app
```

### Headless API (backend only)

```bash
npm create pondoknusa@latest my-api -- --headless
```

Adds a slim dependency set, `src/routes/api.ts`, and headless-aware tooling (`doctor`, `deploy:check`, `pondoknusa dev`).

### Templates

```bash
npm create pondoknusa@latest my-app -- --template=api
npm create pondoknusa@latest my-saas -- --template=saas --auth
npm create pondoknusa@latest my-api -- --template=headless
```

### Options

Pass any `pondoknusa new` flag after `--`:

```bash
npm create pondoknusa@latest my-app -- --db=postgres --redis --queue=redis
npm create pondoknusa@latest my-api -- --headless --no-auth
```

Run `npx pondoknusa new --help` (via the CLI) for the full flag list.

## Docs

- [Getting started](https://pondoknusa.dev/guide/getting-started)
- [Headless API](https://pondoknusa.dev/guide/headless)