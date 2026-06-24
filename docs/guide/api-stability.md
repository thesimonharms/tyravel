# API stability

Tyravel publishes many `@tyravel/*` packages from a single monorepo. This page summarizes how we version those packages and what you can rely on in production.

The canonical policy lives in [STABILITY.md](https://github.com/thesimonharms/tyravel/blob/main/STABILITY.md) on GitHub.

## Version numbers

All first-party packages share one version (for example `0.6.1`) and ship together on each release.

| Release | What to expect |
|---------|----------------|
| **Patch** (`0.6.1` → `0.6.2`) | Bug fixes; stable APIs stay compatible. |
| **Minor** (`0.6.x` → `0.7.0`) | New features; experimental APIs may change; stable APIs only break after deprecation. |
| **Major** (`1.0.0`+) | Strict [semver](https://semver.org/): breaking stable changes only in major versions. |

Tyravel is **pre-1.0**. We still treat patch releases as safe upgrades for documented stable APIs.

## Public API

Use only documented exports from package entry points:

```ts
import { Route, Application } from '@tyravel/core';
import { env, s } from '@tyravel/config';
```

Avoid deep imports (`@tyravel/core/dist/...`, `@tyravel/core/src/...`). Paths not listed in a package's `exports` field are **not supported**.

Public APIs include:

- Facades and kernels documented in the guide (`Route`, `DB`, `Auth`, `Queue`, …)
- HTTP, database, validation, and config APIs covered in these docs
- CLI commands listed in the [README](https://github.com/thesimonharms/tyravel#cli)
- `.tyr` template directives through Tier 6 (see [Views](/guide/views))

## Stable vs experimental

### Stable (production-safe)

Build applications against these without expecting silent breakage in patch releases:

- Application boot, service providers, HTTP kernel, `serve()`
- Routing, middleware, controllers, form requests, validation
- Eloquent-style models, migrations, factories, seeders
- Session/token auth, policies, queues, events, mail, notifications
- Config loading, `env()` / `requiredEnv()`, and optional per-file `schema` validation
- Core view features: layouts, components, stacks, form directives, compiled cache
- SSR and progressive enhancement: `View.renderStream()`, `View.streamSsr()`, `@stream` / `@endstream`, `@island`, `View.getHydrationManifest()`, `Response.ssr()` / `Response.ssrStream()`, `@tyravel/ssr` hydration runtime

### Experimental (may change in minors)

Useful but evolving — read release notes when upgrading minors:

- Programmatic `.tyr.ts` views and `View.catalog()`
- `tyravel shell` / REPL behavior
- `ViewPropsMap` augmentation for typed view props

Experimental features can graduate to stable once documented and covered by compatibility tests.

## Deprecations

When we remove a **stable** API:

1. It is marked `@deprecated` in source and noted in the changelog.
2. It remains available for **at least one minor version**.
3. Release notes describe the replacement.

Upgrade across minors with the [changelog](https://github.com/thesimonharms/tyravel/blob/main/CHANGELOG.md) and [GitHub releases](https://github.com/thesimonharms/tyravel/releases) open.

### v0.9.0 async-native (Tier 9)

**0.9.0** makes runtime I/O async-first. Deprecated sync helpers (`loadEnvSync`, CLI `*Sync` project helpers, compiled-cache `*Sync` exports) remain for one minor and are removed in **1.0.0**. Notable call-site changes:

- `await View.exists(name)` — returns `Promise<boolean>`
- `await requireProjectRoot()` / `await loadProjectConfig()` when using `@tyravel/cli` project helpers
- `config/queue.ts` — use `database` or `redis`; remove `sync` from app config

See the [0.9.0 changelog](https://github.com/thesimonharms/tyravel/blob/main/CHANGELOG.md#090---2026-06-24) for the full migration table.

## Optional drivers

Packages such as `@tyravel/database-mysql`, `@tyravel/database-pg`, `@tyravel/redis-node`, and `@tyravel/storage-aws-s3` version with the monorepo but install only when needed. Their public surface is the driver config types and provider registration — not the full framework API.

## Something broke?

If a **patch** release breaks documented stable behavior, [file an issue](https://github.com/thesimonharms/tyravel/issues) with the package, version, and API involved. We treat that as a regression.