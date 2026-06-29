# 3. Queues & events

Dispatch a background job when a domain event fires.

## Queue config

New apps default to the `database` driver. Confirm `config/queue.ts` points at your SQLite connection and that the `jobs` table migration has run.

See [Queues & jobs](/guide/queues) for Redis workers and failed-job retry.

## Event + listener

```bash
pondoknusa make:event UserRegistered
pondoknusa make:listener SendWelcomeEmail --event=UserRegistered
```

Register the listener in your event service provider (scaffolded by `pondoknusa new`).

## Queued listener

Implement `ShouldQueue` on the listener (or dispatch a job from `handle`) so mail sends outside the request cycle.

## Run the worker

```bash
pondoknusa queue:work
```

In tests, drain the queue explicitly — see [Testing](/guide/testing).

`examples/hello-world` uses `UserRegistered` → queued `SendWelcomeEmail`; call `await t.drainQueue()` in tests before asserting mail.

## Next

[Realtime & deploy](/tutorials/04-realtime-and-deploy) — broadcast events over the native WebSocket hub.