# Application structure

A freshly scaffolded Tyravel app looks like this:

```
my-app/
├── tyravel.json
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

Register the package provider from `AppServiceProvider` so `tyravel migrate` and config loading pick it up.