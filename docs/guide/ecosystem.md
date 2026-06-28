# Ecosystem packages

How to publish and maintain third-party packages that extend Tyravel.

## Naming

- **First-party:** `@tyravel/*` — monorepo packages versioned together
- **Community:** `@your-scope/tyravel-*` or `@your-org/tyravel-*` — independent semver

Use a scope you control on npm. Do not publish unscoped packages named `tyravel-*` that could be confused with official packages.

## Package types

| Type | Examples | Public API |
|------|----------|------------|
| **Driver** | Database, cache, storage, vector, broadcast | Config types + provider registration |
| **Integration** | Payment, analytics, CRM | Service provider + facades optional |
| **Tooling** | CLI plugins, codegen | Documented commands only |

Drivers should expose:

1. A config interface consumed by `config/*.ts`
2. A `ServiceProvider` that registers the driver with the manager (`CacheManager`, `StorageManager`, etc.)
3. Zero undeclared peer dependencies — list optional npm deps in `peerDependencies` and README

## Versioning with Tyravel

- Target the **latest `1.x`** minor when depending on `@tyravel/*`
- Pin the same version for all `@tyravel/*` deps in your package (e.g. `^1.2.0` everywhere)
- Use **peerDependencies** for `@tyravel/core` (and other facades you call) so apps supply one copy
- Follow [STABILITY.md](https://github.com/thesimonharms/tyravel/blob/main/STABILITY.md) — depend only on **stable** exports from package entry points

## Service provider template

```typescript
import { ServiceProvider } from '@tyravel/core';
import type { Application } from '@tyravel/core';

export class AcmeServiceProvider extends ServiceProvider {
  async register(app: Application): Promise<void> {
    // Bind services to the container
  }

  async boot(app: Application): Promise<void> {
    // Register routes, listeners, or drivers after config loads
  }
}
```

Register in `src/main.ts` alongside first-party providers.

## Testing

- Use `@tyravel/testing` `TestCase` for HTTP and container integration tests
- Publish a `vitest` example in your README
- Run CI on **Node 26+** to match Tyravel's engine requirement

## Documentation

- README: install, config keys, provider registration, minimal example
- Link to relevant [guide](/guide/introduction) chapters
- List stable vs experimental APIs you touch

## Official registry

Community packages are not curated by the Tyravel maintainers. Verify source, npm publish dates, and license before installing.

For MCP/agent discovery of first-party APIs, see `tyravel mcp:serve` and the generated [manifest](/reference/) (`docs/.vitepress/generated/manifest.json`).