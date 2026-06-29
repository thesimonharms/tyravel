# Queues & jobs

Register `QueueServiceProvider` and configure `config/queue.ts`:

```typescript
import { env } from '@pondoknusa/config';

export default {
  default: env('QUEUE_CONNECTION', 'database'),
  connections: {
    database: {
      driver: 'database',
      table: 'jobs',
      connection: 'sqlite',
      retryAfter: 90,
    },
    redis: {
      driver: 'redis',
      connection: 'default',
      queue: 'default',
      retryAfter: 90,
    },
  },
  failed: {
    table: 'failed_jobs',
  },
} as const;
```

Set `QUEUE_CONNECTION=database` (or `redis`) in `.env`. The `sync` driver is **not** registered in `QueueManager` for production apps — use `database` or `redis`, and run `pondoknusa queue:work`. Framework tests may use `SyncQueue` directly when they need inline job execution.

## Jobs

```typescript
import { Job } from '@pondoknusa/queue';

export class SendWelcomeEmail extends Job<{ email: string }> {
  override async handle(): Promise<void> {
    // send mail using this.data.email
  }
}
```

Register job classes on the `JobRegistry` in `AppServiceProvider`:

```typescript
this.app.make<JobRegistry>('jobs.registry').register(SendWelcomeEmail);
```

## Dispatching

```typescript
import { dispatch, Queue } from '@pondoknusa/core';

await dispatch(new SendWelcomeEmail({ email: 'ada@example.com' }));
await Queue.connection('database').dispatch(new SendWelcomeEmail({ email: 'grace@example.com' }));
await Queue.later(60, new SendWelcomeEmail({ email: 'later@example.com' }));
```

## Workers

```bash
pondoknusa queue:table
pondoknusa migrate
pondoknusa queue:work --connection=database --queue=default
```

Inspect failed jobs:

```bash
pondoknusa queue:failed-table
pondoknusa migrate
pondoknusa queue:failed
pondoknusa queue:retry 1
```

## Queued listeners in tests

`QueuedListener` subclasses enqueue `CallQueuedListener` jobs instead of running inline. In feature tests with `QUEUE_CONNECTION=database`, drain pending jobs after the HTTP request before asserting side effects (mail, notifications, etc.). See `examples/hello-world/tests/support/reference-test-case.ts` (`drainQueue()`).