# Cache

Register `CacheServiceProvider` and add `config/cache.ts`:

```typescript
export default {
  default: 'array',
  prefix: 'pondoknusa',
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
import { Cache } from '@pondoknusa/core';

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
import { CacheManager } from '@pondoknusa/cache';

const manager = app.make<CacheManager>('cache');
const store = manager.store('file');
await store.put('key', 'value', 60);
```

## Service provider registration

```typescript
import { CacheServiceProvider } from '@pondoknusa/core';

app.register(CacheServiceProvider);
await app.boot();
```

Then wire the facade:

```typescript
import { setCacheApplication } from '@pondoknusa/core';

setCacheApplication(app);
```

## Response cache middleware

Cache full GET responses for anonymous visitors with `createResponseCacheMiddleware()` from `@pondoknusa/http`:

```typescript
import { createResponseCacheMiddleware } from '@pondoknusa/http';
import { Cache } from '@pondoknusa/core';

app.use(createResponseCacheMiddleware({
  cache: Cache.store(),
  ttlSeconds: 300,
  anonymousOnly: true,
}));
```

Authenticated requests (`request.user`) bypass the cache by default. Cached entries include an `x-pondoknusa-cache: HIT|MISS` header for debugging.

## Model attribute caching

Wire the cache once, then call `rememberAttribute()` inside expensive accessors:

```typescript
import { Model } from '@pondoknusa/database';
import { Cache } from '@pondoknusa/core';

Model.setCacheResolver(() => Cache.store());

class Post extends Model {
  async getCommentCountAttribute() {
    return this.rememberAttribute('comment_count', 300, async () => {
      return await this.hasMany(Comment).count();
    });
  }
}

// After mutating data that affects the accessor:
await post.forgetRememberedAttribute('comment_count');
```

Records without a primary key always compute immediately (nothing to key on).