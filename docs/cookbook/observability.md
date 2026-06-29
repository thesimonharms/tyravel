# Production observability

Health probes, structured logs, and queue failure signals for deployed Pondoknusa apps.

## Health endpoint

Scaffolded apps register `HealthServiceProvider` and expose liveness and readiness routes when `config/health.ts` is enabled:

```typescript
// config/health.ts
export default {
  enabled: true,
  path: '/health',
  livenessPath: '/health/live',
  readinessPath: '/health/ready',
  checks: {
    database: true,
    redis: true, // enable when using Redis
  },
} satisfies HealthConfig;
```

| Path | Use |
|------|-----|
| `/health/live` | Liveness — returns `{ status: 'ok' }` without probing dependencies |
| `/health/ready` | Readiness — runs database/Redis checks; `503` when a check fails |
| `/health` | Alias for readiness |

Point load balancer **readiness** probes at `/health/ready`. A `503` on readiness means a dependency failed — inspect the JSON body for per-check status.

Disable Redis checks in single-process dev when Redis is not running:

```typescript
checks: { database: true, redis: envBool('REDIS_HEALTH_CHECK', false) },
```

## Structured logging

`config/log.ts` defaults to a `stack` channel (stdout + file). In production, prefer stdout so your platform captures logs:

```typescript
export default {
  default: env('LOG_CHANNEL', 'stdout'),
  channels: {
    stdout: { channel: 'stdout' },
    file: { channel: 'file', path: 'storage/logs/pondoknusa.log' },
    stack: { channel: 'stack', channels: ['stdout'] },
  },
} satisfies LogConfig;
```

Emit request-scoped context from controllers or middleware:

```typescript
import { Log } from '@pondoknusa/core';

Log.info('order.placed', { orderId: order.id, userId: user.id });
```

Set `APP_DEBUG=false` in production so exception responses do not leak stack traces to clients.

## Queue and job failures

When using `QUEUE_CONNECTION=database`, monitor:

| Signal | Where |
|--------|-------|
| Pending jobs | `jobs` table row count |
| Failed jobs | `failed_jobs` table |
| Worker alive | Separate `pondoknusa queue:work` process or container |

Retry failed jobs after fixing the root cause:

```bash
pondoknusa queue:retry all
```

Run at least one worker process in production — HTTP requests only enqueue work; they do not process it.

## Graceful shutdown

`serve()` in `@pondoknusa/core` handles `SIGTERM`: in-flight requests drain before the process exits. Orchestrators (Fly, Railway, Kubernetes) send `SIGTERM` on scale-in — allow a 30s grace period in your platform config.

## Related

- [Deployment overview](/guide/deployment) — env vars and process model
- [Queues & jobs](/guide/queues) — dispatch, workers, failed job tables
- [Configuration reference](/guide/configuration-reference) — `LOG_*` and health keys