# API Stability Policy

Tyravel publishes the `@tyravel/*` packages as a versioned monorepo. This document defines what we treat as a **public, supported API**, what is **experimental**, and how we handle **deprecations and breaking changes**.

## Versioning

All first-party packages share a single version (for example `0.6.1`) and are released together.

| Segment | Meaning |
|---------|---------|
| **MAJOR** | Breaking changes to stable APIs (reserved for `1.0.0` and later). |
| **MINOR** | New features, deprecations, and experimental API changes. |
| **PATCH** | Bug fixes and non-breaking corrections to stable APIs. |

### Pre-1.0 (`0.y.z`)

Tyravel is pre-1.0. We still follow the table above in spirit:

- **Patch releases** (`0.6.1` → `0.6.2`) do not intentionally remove or break stable APIs.
- **Minor releases** (`0.6.x` → `0.7.0`) may introduce breaking changes to **experimental** APIs and may deprecate stable APIs. Breaking changes to **stable** APIs require a deprecation window (see below) except when explicitly called out in release notes for urgent fixes.
- **1.0.0** will mark the first semver-strict era: stable APIs only break in major releases.

## What counts as public API

A symbol, command, or configuration key is **public** when all of the following are true:

1. It is exported from a package entry point listed in that package's `package.json` `exports` field (typically the package root `.` export).
2. It is documented in the [docs site](docs/guide/introduction.md), package README, or CLI `--help` / `tyravel list` output.
3. It is not marked **experimental** or **internal** in this policy or in JSDoc.

### Not public (unsupported)

- Deep imports such as `@tyravel/core/dist/...` or `@tyravel/core/src/...`.
- Any path not listed in a package's `exports` map.
- Undocumented exports, even if reachable from the entry barrel.
- Application-private code under `app/`, `src/`, or `resources/` in generated projects.
- Monorepo-only workspace wiring and release scripts.

If you depend on a non-public API, expect it to change without notice.

## Stability tiers

### Stable

Stable APIs are safe to build production applications on. Patch releases preserve their behavior; removals require deprecation.

| Area | Stable surface |
|------|----------------|
| **Kernel** | `Application`, `ServiceProvider`, `HttpKernel`, `ExceptionHandler`, `serve()` |
| **Facades** | `Route`, `DB`, `Auth`, `Cache`, `Queue`, `Events`, `Log`, `Mail`, `Notifications`, `Schedule`, `Storage`, `View`, `Config` (via repository) |
| **HTTP** | `Router`, middleware registry, `Request`/`Response` helpers, CORS/throttle middleware, API resources |
| **Database** | `Model`, query builder, relations, migrations, factories, seeders, pagination |
| **Validation** | `Validator`, `validateRequest`, pipe rules |
| **Config** | `env`, `envBool`, `envInt`, `requiredEnv`, `loadConfig`, `ConfigRepository`, `s` config schemas |
| **Views** | `.tyr` directives documented through Tier 6 (layouts, components, stacks, forms, `@if`/`@foreach`, etc.) |
| **SSR & hydration** | `View.renderStream()`, `View.streamSsr()`, `@stream` / `@endstream`, `@island` / `@endisland`, `View.getHydrationManifest()`, `data-tyr-island` markers, `Response.ssr()` / `Response.ssrStream()` / `buildSsrDocument()` / `streamSsrDocument()`, `@tyravel/ssr` (`registerIsland`, `hydrate`, `readManifestFromDocument`), `@tyravel/testing` `assertIsland` / `assertHydrationManifest` |
| **Queue & events** | Job dispatch, workers, listeners, subscribers |
| **Auth** | Session guard, API tokens, `Gate`, password reset, OAuth providers |
| **CLI** | Commands listed in the root README (`tyravel new`, `serve`, `migrate`, `make:*`, `queue:*`, `view:*`, etc.) |
| **Testing** | `@tyravel/testing` `TestCase`, HTTP client, `renderView`, assertion helpers |

### Experimental

Experimental APIs are shipped and tested but may change in a minor release without a full deprecation cycle. Use them with the understanding that upgrades may require small adaptations.

| Area | Experimental surface |
|------|----------------------|
| **Views (P7)** | Programmatic `.tyr.ts` views, `View.catalog()` |
| **DX** | `tyravel shell` / `@tyravel/repl` facade loading behavior |
| **Bus** | Auto-discovered command/provider conventions (paths and naming may evolve) |
| **Typed view props** | `ViewPropsMap` module augmentation pattern |

Experimental APIs may be promoted to **stable** in a minor release once documented and covered by compatibility tests.

### Internal

Internal APIs are implementation details. They may change in any release.

- Template compiler ops (`TemplateOp`, private parser helpers)
- Compiled view cache file format on disk
- Service-provider boot ordering assumptions not documented as extension points
- Test-only utilities under `packages/*/test/` or `*.test.ts`

## Deprecation policy

When we remove or materially change a **stable** API:

1. **Mark** the API with `@deprecated` JSDoc in the release that announces the change.
2. **Document** the replacement in `CHANGELOG.md` and GitHub release notes.
3. **Wait** at least **one minor version** before removal (for example deprecate in `0.7.0`, remove no earlier than `0.8.0`).
4. **Warn** in development where practical (console warning on deprecated facade methods or CLI flags).

Deprecated APIs remain functional until the removal version unless a security fix requires otherwise (called out explicitly in release notes).

## Breaking change process

1. Open a ROADMAP or release-plan item describing the break and migration path.
2. Implement with deprecation period when the old API is stable.
3. Update `CHANGELOG.md`, docs, and scaffold stubs (`packages/cli/src/stubs*.ts`).
4. Bump the monorepo minor (or major post-1.0) and publish all `@tyravel/*` packages together via the release workflow.

## Package scope

Every published `@tyravel/*` package follows this policy for its documented exports. Optional driver packages (`@tyravel/database-mysql`, `@tyravel/redis-node`, `@tyravel/storage-aws-s3`, etc.) version in lockstep with core but may be installed independently; their public API is limited to driver registration and connection config types.

## Reporting instability

If a patch release breaks documented stable behavior, please [open an issue](https://github.com/thesimonharms/tyravel/issues) with the package name, version, and API surface affected. We treat that as a bug and aim to fix forward in a patch release.

## Related documents

- [CHANGELOG.md](CHANGELOG.md) — version history
- [ROADMAP.md](ROADMAP.md) — planned features and tier completion
- [docs/guide/api-stability.md](docs/guide/api-stability.md) — guide-oriented summary