# Tyravel Roadmap

Post-v0.1.0 direction. v0.1 shipped the core Laravel-shaped stack; subsequent releases focus on polish, production adapters, and real-world ergonomics.

## Tier 1 — Credibility (v0.2.0)

Make the framework trustworthy for early adopters.

- [x] **Reference app** — Upgrade `examples/hello-world` (or add `examples/blog`) with `auth:install`, a queued job, a mailable, and a feature test
- [x] **`.env` support** — `loadEnv()`, `env()` helper, `.env.example`, config stubs wired to environment variables
- [ ] **Exception handler polish** — Debug pages for web, consistent JSON errors for API
- [ ] **CI + release script** — Automated test/build/publish in dependency order

## Tier 2 — Daily-driver quality (v0.2.x)

Close gaps developers hit on day two of a real project.

- [ ] **ORM eager loading** — `with()` to avoid N+1 queries on relationships
- [ ] **Seeders + factories** — Dev data and test ergonomics (`tyravel make:factory`, `db:seed`)
- [ ] **Redis queue + cache drivers** — First production-grade external adapter
- [ ] **Driver-aware migrations** — Postgres/MySQL schema parity beyond SQLite-centric blueprints

## Tier 3 — Adoption (v0.3+)

Grow the ecosystem and Laravel parity for API-heavy apps.

- [ ] **Form requests** — Validation + authorization on controller actions
- [ ] **API resources / transformers** — Structured JSON serialization
- [ ] **Documentation site** — Tutorials beyond the monorepo README
- [ ] **More auth adapters** — Redis/database session drivers, additional OAuth providers

## Shipped in v0.1.0

- Service container, HTTP router, kernel, facades, CLI scaffolding
- Route groups, controllers, config, middleware, validation, Node `serve()`
- Eloquent-style ORM, views, queue/events
- Auth (session, tokens, OAuth, policies, password reset)
- `@tyravel/testing`, cache, mail (SMTP + queued), notifications (queued)