# Tyravel Roadmap

Post-v0.1.0 direction. v0.1 shipped the core Laravel-shaped stack; subsequent releases focus on polish, production adapters, and real-world ergonomics.

## Tier 1 — Credibility (v0.2.0)

Make the framework trustworthy for early adopters.

- [x] **Reference app** — Upgrade `examples/hello-world` (or add `examples/blog`) with `auth:install`, a queued job, a mailable, and a feature test
- [x] **`.env` support** — `loadEnv()`, `env()` helper, `.env.example`, config stubs wired to environment variables
- [x] **Exception handler polish** — `ExceptionHandler` with debug HTML pages, consistent JSON API errors, `HttpException` base class, 405 Method Not Allowed
- [x] **CI + release script** — GitHub Actions CI (typecheck/build/test on push+PR), automated npm publish on tag, `npm run release:prepare` version bumper

## Tier 2 — Daily-driver quality (v0.2.x)

Close gaps developers hit on day two of a real project.

- [x] **ORM eager loading** — `with()` to avoid N+1 queries on relationships
- [x] **Seeders + factories** — Dev data and test ergonomics (`tyravel make:factory`, `db:seed`)
- [x] **Redis queue + cache drivers** — First production-grade external adapter
- [x] **Driver-aware migrations** — Postgres/MySQL schema parity beyond SQLite-centric blueprints

## Tier 3 — Adoption (v0.3+)

Grow the ecosystem and Laravel parity for API-heavy apps.

- [x] **Form requests** — Validation + authorization on controller actions
- [x] **API resources / transformers** — Structured JSON serialization
- [x] **Documentation site** — Tutorials beyond the monorepo README
- [x] **More auth adapters** — Redis/database session drivers, additional OAuth providers

## Shipped in v0.1.0

- Service container, HTTP router, kernel, facades, CLI scaffolding
- Route groups, controllers, config, middleware, validation, Node `serve()`
- Eloquent-style ORM, views, queue/events
- Auth (session, tokens, OAuth, policies, password reset)
- `@tyravel/testing`, cache, mail (SMTP + queued), notifications (queued)