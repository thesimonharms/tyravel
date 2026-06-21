# Introduction

Tyravel is a TypeScript-native web framework that brings Laravel-style ergonomics to Node.js 22+. It runs on standard Web APIs (`Request`, `Response`, `fetch`) and ships as a set of focused npm packages you can adopt incrementally.

## What you get

- **Application kernel** — service container, providers, HTTP kernel, and facades (`Route`, `Auth`, `Queue`, …)
- **HTTP layer** — router with groups and named routes, middleware registry, JSON/HTML/XML responses
- **Database** — Eloquent-style models, query builder, migrations, factories, seeders, and pagination
- **Auth** — session and token guards, OAuth (GitHub, Google, Discord, Microsoft), policies, password reset
- **Async work** — typed jobs, sync/database/redis queue drivers, domain events and listeners
- **DX** — `tyravel` CLI for scaffolding, migrations, seeding, and a built-in dev server

## Requirements

- Node.js **22+** (Bun is also supported as a runtime)
- npm workspaces for monorepo development; published packages install like any other dependency

## Packages

| Package | Role |
|---------|------|
| `@tyravel/core` | Application kernel and facades |
| `@tyravel/http` | Router, middleware, requests, responses |
| `@tyravel/database` | ORM, migrations, pagination |
| `@tyravel/auth` | Guards, sessions, OAuth, policies |
| `@tyravel/cli` | Project scaffolding and generators |

See the [monorepo README](https://github.com/thesimonharms/tyravel#packages) for the full package list.