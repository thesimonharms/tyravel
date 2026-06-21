# Queues & jobs

Register `QueueServiceProvider` and configure `config/queue.ts`:

```typescript
export default {
  default: 'sync',
  connections: {
    sync: { driver: 'sync' },
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
} as const;
```

## Jobs

```typescript
import { Job } from '@tyravel/queue';

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
import { dispatch, Queue } from '@tyravel/core';

await dispatch(new SendWelcomeEmail({ email: 'ada@example.com' }));
await Queue.connection('database').dispatch(new SendWelcomeEmail({ email: 'grace@example.com' }));
await Queue.later(60, new SendWelcomeEmail({ email: 'later@example.com' }));
```

## Workers

```bash
tyravel queue:table
tyravel migrate
tyravel queue:work --connection=database --queue=default
```

Inspect failed jobs:

```bash
tyravel queue:failed-table
tyravel migrate
tyravel queue:failed
tyravel queue:retry 1
```