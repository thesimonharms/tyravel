# Cache

Register `CacheServiceProvider` and add `config/cache.ts`:

```typescript
export default {
  default: 'array',
  prefix: 'tyravel',
  connections: {
    array: { driver: 'array' },
    file: { driver: 'file', path: storage_path('framework/cache/data') },
    redis: {
      driver: 'redis',
      connection: 'default',
      prefix: 'cache',
    },
  },
} as const;
```

## Using the Cache facade

```typescript
import { Cache } from '@tyravel/core';

// Store a value for 60 seconds
await Cache.put('post:42', { title: 'Hello' }, 60);

// Retrieve — returns null if expired or missing
const post = await Cache.get('post:42');

// Check existence
const exists = await Cache.has('post:42');

// Remember — return cached or compute and store
const popular = await Cache.remember('popular:posts', 300, async () => {
  return await Post.query().orderBy('views', 'desc').limit(10).getModels();
});

// Remove a key
await Cache.forget('post:42');

// Clear the entire cache
await Cache.flush();
```

## Drivers

| Driver | Description |
|--------|-------------|
| `array` | In-memory store — resets on restart. Best for tests and development |
| `file` | File-based store on the local filesystem |
| `redis` | Redis-backed store. Requires `RedisServiceProvider` |

### Redis

The `redis` driver uses the `RedisManager` connection pool. Configure the connection name to match one of your `config/redis.ts` connections:

```typescript
redis: {
  driver: 'redis',
  connection: 'default',
  prefix: 'cache',
},
```

## Direct store usage

Access a specific connection directly via `CacheManager`:

```typescript
import { CacheManager } from '@tyravel/cache';

const manager = app.make<CacheManager>('cache');
const store = manager.store('file');
await store.put('key', 'value', 60);
```

## Service provider registration

```typescript
import { CacheServiceProvider } from '@tyravel/core';

app.register(CacheServiceProvider);
await app.boot();
```

Then wire the facade:

```typescript
import { setCacheApplication } from '@tyravel/core';

setCacheApplication(app);
```