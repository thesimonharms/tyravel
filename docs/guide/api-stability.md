# API stability

Pondoknusa publishes many `@pondoknusa/*` packages from a single monorepo. This page summarizes how we version those packages and what you can rely on in production.

The canonical policy lives in [STABILITY.md](https://github.com/pondoknusa/pondoknusa/blob/main/STABILITY.md) on GitHub.

## Version numbers

All first-party packages share one version (for example `1.0.1`) and ship together on each release.

| Release | What to expect |
|---------|----------------|
| **Patch** (`1.0.0` → `1.0.1`) | Bug fixes; stable APIs stay compatible. |
| **Minor** (`1.0.x` → `1.1.0`) | New features; experimental APIs may change; stable APIs only break after deprecation. |
| **Major** (`1.x` → `2.0.0`) | Strict [semver](https://semver.org/): breaking stable changes only in major versions. |

**1.0.0** marked the first semver-strict era. Patch and minor releases preserve documented stable APIs unless a symbol is explicitly deprecated.

## Public API

Use only documented exports from package entry points:

```ts
import { Route, Application } from '@pondoknusa/core';
import { env, s } from '@pondoknusa/config';
```

Avoid deep imports (`@pondoknusa/core/dist/...`, `@pondoknusa/core/src/...`). Paths not listed in a package's `exports` field are **not supported**.

Public APIs include:

- Facades and kernels documented in the guide (`Route`, `DB`, `Auth`, `Queue`, …)
- HTTP, database, validation, and config APIs covered in these docs
- CLI commands listed in the [README](https://github.com/pondoknusa/pondoknusa#cli)
- `.tyr` template directives through Tier 6 (see [Views](/guide/views))

## Stable vs experimental

### Stable (production-safe)

Build applications against these without expecting silent breakage in patch releases:

- Application boot, service providers, HTTP kernel, `serve()`
- Routing, middleware, controllers, form requests, validation
- Eloquent-style models, migrations, factories, seeders; route model binding; global scopes; `HasUuids` / `HasUlids`; `prunable()` models; lazy-load prevention
- API resources with nested resources, conditional attributes, and pagination meta
- Routing: `route()` URL generation, signed URLs, route caching, `Route.group()`, per-route `throttle()`
- Session/token auth, policies, queues, events, mail, notifications
- Config loading, `env()` / `requiredEnv()`, and optional per-file `schema` validation
- Core view features: layouts, components, stacks, form directives, compiled cache, typed props (`ViewPropsMap`, `pondoknusa view:types`), `view:lint --strict`, partial reload helpers (`View.partial()`, `Response.partial()`), `View.catalog()` / `View.islandCatalog()`, `pondoknusa view:catalog`
- SSR and progressive enhancement: `View.renderStream()`, `View.streamSsr()`, `@stream` / `@endstream`, `@island`, `View.getHydrationManifest()`, `Response.ssr()` / `Response.ssrStream()`, `@pondoknusa/ssr` hydration runtime
- Programmatic `.tyr.ts` views (`render()` + optional `mount()` island contract)
- `pondoknusa shell` / `@pondoknusa/repl` (`startRepl`, facade loading, `.models` / `.facades` commands)

### Experimental (may change in minors)

Useful but evolving — read release notes when upgrading minors:


- `Bus` auto-discovery naming conventions (not a facade)
- `@pondoknusa/crypto` algorithms, key formats, and envelope serialization
- `@pondoknusa/auth-oauth` OAuth2 server grants, signed token layout, and repository APIs
- Session encryption at rest and ML-DSA OAuth token signing integration flags

Experimental features can graduate to stable once documented and covered by compatibility tests.

## Deprecations

When we remove a **stable** API:

1. It is marked `@deprecated` in source and noted in the changelog.
2. It remains available for **at least one minor version**.
3. Release notes describe the replacement.

Upgrade across minors with the [changelog](https://github.com/pondoknusa/pondoknusa/blob/main/CHANGELOG.md) and [GitHub releases](https://github.com/pondoknusa/pondoknusa/releases) open.

## Long-term support (1.x)

After **1.0.0**, Pondoknusa publishes security patches for the latest `1.y` minor for at least **6 months** after the next minor ships. Patch releases preserve stable APIs. See [STABILITY.md](https://github.com/pondoknusa/pondoknusa/blob/main/STABILITY.md#long-term-support-1x) and [SECURITY.md](https://github.com/pondoknusa/pondoknusa/blob/main/SECURITY.md).

## Security

Report vulnerabilities privately per [SECURITY.md](https://github.com/pondoknusa/pondoknusa/blob/main/SECURITY.md) — do not file public issues for security flaws.

### v0.9.0 async-native (Tier 9)

**0.9.0** made runtime I/O async-first. Sync helpers were deprecated then and **removed in 0.16.0** ahead of **1.0.0**. Notable call-site changes:

- `await View.exists(name)` — returns `Promise<boolean>`
- `await View.catalog()` / `await View.islandCatalog()` — catalog discovery is async
- `await requireProjectRoot()` / `await loadProjectConfig()` when using `@pondoknusa/cli` project helpers
- `config/queue.ts` — use `database` or `redis`; remove `sync` from app config

See [Upgrading to 1.0](/guide/upgrading-to-1.0) for the full removal table and checklist.

### v0.16.0 core surface polish (Tier 16)

**0.16.0** promotes models, routes, and views APIs listed above to stable and completes the pre-1.0 deprecation sweep. Read the [0.16.0 changelog](https://github.com/pondoknusa/pondoknusa/blob/main/CHANGELOG.md#0160---2026-06-27) for feature details.

## Optional drivers

Packages such as `@pondoknusa/database-mysql`, `@pondoknusa/database-pg`, `@pondoknusa/redis-node`, and `@pondoknusa/storage-aws-s3` version with the monorepo but install only when needed. Their public surface is the driver config types and provider registration — not the full framework API.

## Something broke?

If a **patch** release breaks documented stable behavior, [file an issue](https://github.com/pondoknusa/pondoknusa/issues) with the package, version, and API involved. We treat that as a regression.