# Authentication

Install auth scaffolding:

```bash
tyravel auth:install
tyravel migrate
```

## Guards

`config/auth.ts` defines session (`web`) and token (`api`) guards:

```typescript
guards: {
  web: { driver: 'session', provider: 'users' },
  api: { driver: 'token', provider: 'users' },
},
```

Use middleware aliases:

```typescript
Route.middleware('auth').get('/dashboard', handler);
Route.middleware('auth:api').get('/api/me', handler);
Route.middleware('guest').get('/login', handler);
```

## Session drivers

Configure the session store in `config/auth.ts`:

```typescript
session: {
  driver: 'database', // array | database | redis
  cookie: 'tyravel_session',
  lifetimeMinutes: 120,
  table: 'sessions',
  connection: 'sqlite',
},
```

| Driver | Use case |
|--------|----------|
| `array` | Tests and local prototyping (in-memory) |
| `database` | Default; persists to the `sessions` table |
| `redis` | Production; requires `RedisServiceProvider` |

Redis sessions:

```typescript
session: {
  driver: 'redis',
  cookie: 'tyravel_session',
  lifetimeMinutes: 120,
  redisConnection: 'default',
  prefix: 'tyravel:session',
},
```

## OAuth

Built-in providers: **GitHub**, **Google**, **Discord**, **Microsoft**.

```typescript
oauth: {
  providers: {
    github: {
      clientId: env('GITHUB_CLIENT_ID', ''),
      clientSecret: env('GITHUB_CLIENT_SECRET', ''),
      redirectUri: env('GITHUB_REDIRECT_URI', 'http://127.0.0.1:3000/auth/github/callback'),
    },
    discord: {
      clientId: env('DISCORD_CLIENT_ID', ''),
      clientSecret: env('DISCORD_CLIENT_SECRET', ''),
      redirectUri: env('DISCORD_REDIRECT_URI', 'http://127.0.0.1:3000/auth/discord/callback'),
    },
  },
},
```

Routes (from `auth:install`):

- `GET /auth/:provider/redirect`
- `GET /auth/:provider/callback`

## API tokens

Issue personal access tokens from the authenticated API guard and send them as `Authorization: Bearer <token>`.

## Policies

Map models to policy classes in `config/auth.ts` and authorize in controllers or form requests with `Gate` / `authorizePolicy()`.