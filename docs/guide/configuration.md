# Configuration

`ConfigServiceProvider` loads `.env` from the application root, then imports every `config/*.ts` file into a `ConfigRepository`.

```typescript
// .env
APP_NAME=Tyravel
APP_DEBUG=true

// config/app.ts
import { env } from '@tyravel/config';

export default {
  name: env('APP_NAME', 'Tyravel'),
  debug: env('APP_DEBUG', true),
} as const;
```

Access config anywhere after boot:

```typescript
const config = app.make<ConfigRepository>('config');
const name = config.get<string>('app.name');
```

## Package config merge

Packages can register defaults that merge with app overrides (Laravel-style `mergeConfigFrom`):

```typescript
await this.mergeConfigFrom(join(import.meta.dirname, '../config/lontar.js'), 'lontar');
```

Or merge an object directly:

```typescript
app.mergeConfig('lontar', { perPage: 15, feed: { title: 'Lontar' } });
```

App values win on conflicts; nested keys are merged recursively.