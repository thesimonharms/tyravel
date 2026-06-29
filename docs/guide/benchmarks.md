# Performance benchmarks

Pondoknusa ships a benchmark harness for baseline throughput on HTTP, ORM, views, middleware, and boot paths.

## Run locally

Build the workspace first, then:

```bash
npm run benchmark
```

JSON output for CI or dashboards:

```bash
npm run benchmark -- --json
```

Quick smoke mode (fewer samples):

```bash
BENCHMARK_QUICK=1 npm run benchmark
```

## What is measured

| Benchmark | Key | What it exercises |
|-----------|-----|-------------------|
| Boot cold start | `boot.cold` | `Application` → `serve()` listen |
| HTTP JSON | `http.json` | In-process `GET /bench` JSON responses |
| HTTP JSON fast path | `http.json.fast` | Session-skipped API route with request pooling |
| Middleware stack | `middleware.stack` | Full kernel middleware on a simple route |
| Session auth | `session.auth` | Session + auth middleware on a protected route |
| HTTP SSR | `http.ssr` | Full-stack `welcome.tyr` through `HttpKernel` |
| ORM select | `orm.select` | `Model.all()` against 100 seeded SQLite rows |
| View compile | `view.compile` | Compiling `welcome.tyr` |
| View render | `view.render` | Rendering `welcome.tyr` with context |

### Competitive JSON baselines

Same machine, same Node version, same `GET /bench` → `{ "ok": true }` payload, same `fetch` client and sample sizes:

| Benchmark | Key | Framework |
|-----------|-----|-----------|
| Compare Pondoknusa | `compare.pondoknusa` | Pondoknusa `HttpKernel` |
| Compare Express | `compare.express` | Express 5 |
| Compare Fastify | `compare.fastify` | Fastify 5 |
| Compare Hono | `compare.hono` | Hono + `@hono/node-server` |

These are **informational baselines** on a minimal JSON route — not a full framework shootout. Pondoknusa’s value is the integrated stack (ORM, views, auth, queues). Use competitive rows to sanity-check HTTP overhead, not to pick a winner in isolation.

Throughput varies with CPU, Node version, and concurrent load.

## Latest CI numbers

<!-- @include: ../.vitepress/generated/benchmark-latest.md -->

If the snapshot is missing locally, run `npm run benchmark -- --json > benchmark-report.json` then `node scripts/benchmark-snapshot.mjs benchmark-report.json`.

## Interpreting results

- **req/s** and **ops/s** are rounded integers derived from total samples divided by elapsed milliseconds.
- Compare runs on the same machine and Node version when tracking regressions.
- Use the [observability cookbook](/cookbook/observability) for production latency — benchmarks do not replace real traffic profiling.

## CI trend artifacts

On every push to `main`, the [Benchmarks workflow](https://github.com/pondoknusa/pondoknusa/actions/workflows/benchmarks.yml) runs quick-mode benchmarks (`BENCHMARK_QUICK=1`), compares against the previous baseline (warns on >15% drop), and uploads a JSON artifact named `benchmark-report-<sha>`.

A [weekly full benchmark](https://github.com/pondoknusa/pondoknusa/actions/workflows/benchmarks-weekly.yml) runs every Monday with `BENCHMARK_QUICK=0`, larger sample sizes, and **365-day** artifact retention for trend charts.

The job is **informational only** — it does not fail the build on regressions. Use it to spot large swings before they reach production profiling.

### Expected ranges (Node 26, Linux CI, quick mode)

GitHub-hosted `ubuntu-latest` runners are noisy; treat these as ballpark ranges, not pass/fail gates:

| Benchmark | Typical range |
|-----------|---------------|
| `http.json` | 800 – 3,000 req/s |
| `http.json.fast` | 1,200 – 4,000 req/s |
| `http.ssr` | 200 – 800 req/s |
| `orm.select` | 5,000 – 20,000 ops/s |
| `view.compile` | 20,000 – 60,000 ops/s |
| `view.render` | 2,000 – 8,000 ops/s |
| `boot.cold` | 50 – 200 ms |

Full local runs (`BENCHMARK_QUICK=0`) use larger sample sizes and usually report higher throughput on a dedicated machine.

## Bun vs Node

Pondoknusa targets **Node.js 26+** as the production runtime. [Bun](https://bun.sh) can run Pondoknusa for development and experiments:

```bash
bun run npm run benchmark
```

Observed patterns (informal, machine-dependent):

| Area | Bun | Node 26 |
|------|-----|---------|
| HTTP throughput | Often 1.1–1.4× Node on simple JSON routes | Stable baseline; use for CI regression gates |
| Boot time | Comparable or slightly faster | Reference for production deploys |
| `node:sqlite` ORM bench | Requires Node built-in module | Fully supported |
| Ecosystem drivers | Verify per driver package | Recommended for Postgres/MySQL/Redis |

Use Node for production deploys and CI gates. Use Bun optionally for local dev velocity when your driver stack supports it.

## Related

- [Performance](/guide/performance) — boot checklist, pool sizing, caching
- [Deployment](/guide/deployment) — horizontal scaling and worker sizing
- [Observability cookbook](/cookbook/observability) — health probes, structured logs, queue failure signals
- [Testing](/guide/testing) — feature and integration coverage alongside perf baselines