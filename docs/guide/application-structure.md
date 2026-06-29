# Application structure

A freshly scaffolded Pondoknusa app looks like this:

```
my-app/
├── pondoknusa.json
├── package.json
├── .env
├── config/
│   ├── app.ts
│   ├── database.ts
│   └── auth.ts
├── database/
│   ├── migrations/
│   ├── factories/
│   └── seeders/
├── resources/
│   └── views/
└── src/
    ├── main.ts
    ├── routes/
    ├── controllers/
    ├── providers/
    │   └── app-service-provider.ts
    └── models/
```

## Service providers

Providers register bindings and boot framework features. Register them in `main.ts` **before** `app.boot()`:

```typescript
app.register(ConfigServiceProvider);
app.register(DatabaseServiceProvider);
app.register(AuthServiceProvider);
app.register(AppServiceProvider);
```

`AppServiceProvider` is where application-specific bindings, middleware aliases, and route facades live.

### Async-first `register()` / `boot()`

`ServiceProvider.register()` and `ServiceProvider.boot()` may return `void` or `Promise<void>`. Pondoknusa is moving to an async-native runtime: **prefer `async register()` and `async boot()`** whenever a hook touches the filesystem, config, or other I/O.

`Application.boot()` always `await`s each provider hook in registration order:

1. Every provider's `register()` runs (in order) before any `boot()` runs.
2. Every provider's `boot()` runs (in order) after all `register()` hooks finish.

Synchronous hooks remain valid for quick, non-blocking setup (for example `this.app.instance(...)`). Do not call blocking sync FS or network APIs from provider hooks — use the async variants from `node:fs/promises` or driver APIs that return promises.

```typescript
export class AppServiceProvider extends ServiceProvider {
  override async register() {
    this.app.instance('app.name', 'Pondoknusa');
  }

  override async boot() {
    // Route facades, middleware aliases, etc.
  }
}
```

## Package contributions

Packages can ship migrations and default config:

```typescript
export class LontarServiceProvider extends ServiceProvider {
  override async register() {
    this.loadMigrationsFrom(join(import.meta.dirname, 'database/migrations'));
    await this.mergeConfigFrom(join(import.meta.dirname, '../config/lontar.js'), 'lontar');
  }
}
```

Register the package provider from `AppServiceProvider` so `pondoknusa migrate` and config loading pick it up.