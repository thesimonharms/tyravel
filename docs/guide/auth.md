# Authentication

Install auth scaffolding:

```bash
pondoknusa auth:install
pondoknusa migrate
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
  cookie: 'pondoknusa_session',
  lifetimeMinutes: 120,
  secure: env('SESSION_SECURE', 'false') === 'true',
  sameSite: 'Lax', // Lax | Strict | None
  table: 'sessions',
  connection: 'sqlite',
},
```

Set `SESSION_SECURE=true` in production so session cookies are only sent over HTTPS.

| Driver | Use case |
|--------|----------|
| `array` | Tests and local prototyping (in-memory) |
| `database` | Default; persists to the `sessions` table |
| `redis` | Production; requires `RedisServiceProvider` |

Redis sessions:

```typescript
session: {
  driver: 'redis',
  cookie: 'pondoknusa_session',
  lifetimeMinutes: 120,
  redisConnection: 'default',
  prefix: 'pondoknusa:session',
},
```

## Social OAuth

Built-in providers: **GitHub**, **Google**, **Discord**, **Microsoft**, **X**, **Facebook**, **LinkedIn**, **Apple**, **GitLab**, **Slack**, **Spotify**, **Twitch**, and **Bitbucket**.

All built-in drivers use **PKCE** for the authorization code flow. The auth scaffold stores the PKCE verifier in session during redirect and sends it during callback.

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

Register custom providers before auth boots:

```typescript
import { registerOAuthDriver } from '@pondoknusa/auth';
import { AcmeOAuthDriver } from '../social/drivers/AcmeOAuthDriver.js';

registerOAuthDriver('acme', AcmeOAuthDriver);
```

Scaffold a custom driver:

```bash
pondoknusa make:social-driver acme
```

Apple supports either a pre-generated `clientSecret` or dynamic JWT generation via `teamId`, `keyId`, and `privateKey` in the provider config.

Self-hosted GitLab uses the same built-in driver with a custom `baseUrl`:

```typescript
gitlab: {
  clientId: env('GITLAB_CLIENT_ID', ''),
  clientSecret: env('GITLAB_CLIENT_SECRET', ''),
  redirectUri: env('GITLAB_REDIRECT_URI', 'http://127.0.0.1:3000/auth/gitlab/callback'),
  baseUrl: env('GITLAB_BASE_URL', 'https://gitlab.com'),
},
```

Set `GITLAB_BASE_URL` to your instance root (for example `https://gitlab.example.com`). Omit it or leave the default for gitlab.com.

Use a custom driver name in config when the provider key differs from the built-in driver id:

```typescript
providers: {
  twitter: {
    driver: 'x',
    clientId: env('X_CLIENT_ID', ''),
    clientSecret: env('X_CLIENT_SECRET', ''),
    redirectUri: env('X_REDIRECT_URI', 'http://127.0.0.1:3000/auth/twitter/callback'),
  },
},
```

## CSRF protection

`AuthServiceProvider` registers global CSRF verification after the session middleware. Mutating requests must include the session token via a hidden `_token` field or the `X-CSRF-TOKEN` header.

Safe methods (`GET`, `HEAD`, `OPTIONS`) are skipped. `/api/*` and `/broadcasting/auth` are exempt by default.

Auth scaffold routes include the `csrf` middleware alias on form posts:

```typescript
Route.middleware(['csrf', 'guest']).post('/login', handler);
```

Use `@csrf` in `.tyr` forms to render the hidden field.

## API tokens

Issue personal access tokens from the authenticated session guard and send them as `Authorization: Bearer <token>`.

New tokens use the configured prefix (default `tyr_`) plus a random secret. Only the secret is hashed at rest; the prefix is stored separately for log identification.

```typescript
const token = await Auth.createToken('mobile-app', ['posts:read', 'posts:write'], {
  expiresIn: '90d',
  ipWhitelist: ['203.0.113.10'],
});
// token.plainTextToken is shown once at creation
```

Revoke a single token or every token for the current user:

```typescript
await Auth.revokeToken(tokenId);
await Auth.revokeAllTokens();
```

Configure token defaults in `config/auth.ts`:

```typescript
tokens: {
  table: 'personal_access_tokens',
  prefix: 'tyr_',
  prefixLength: 8,
},
```

Token `abilities` are enforced at runtime. Gate routes with `createTokenAbilityMiddleware`:

```typescript
import { createTokenAbilityMiddleware } from '@pondoknusa/auth';

Route.middleware(['auth:api', createTokenAbilityMiddleware('posts:write')])
  .post('/api/posts', handler);
```

The wildcard ability `*` grants full access.

## OAuth2 authorization server

Issue access tokens to third-party apps with `@pondoknusa/auth-oauth`.

```bash
pondoknusa oauth:install
npm install @pondoknusa/auth-oauth
pondoknusa migrate
pondoknusa oauth:client:create "My App" --redirect=http://127.0.0.1:3000/callback
```

Register the provider in `src/main.ts` (done automatically by `oauth:install`):

```typescript
import { OAuthServerServiceProvider } from '@pondoknusa/auth-oauth';

app.register(OAuthServerServiceProvider);
```

Supported grants:

| Grant | Use case |
|-------|----------|
| `authorization_code` | User-delegated access with PKCE |
| `client_credentials` | Machine-to-machine |
| `refresh_token` | Long-lived sessions |

Endpoints:

- `GET /oauth/authorize` — inspect pending authorization (session required)
- `POST /oauth/authorize` — approve and redirect with `code`
- `POST /oauth/token` — exchange code, refresh token, or client credentials
- `POST /oauth/revoke` — revoke an access token (RFC 7009)
- `GET /oauth/userinfo` — profile for `auth:oauth` bearer tokens

Protect routes with issued tokens:

```typescript
Route.middleware('auth:oauth').get('/api/external', handler);
```

## Security hardening

Pondoknusa includes several security defaults and opt-in hardening features.

### CSRF protection

`AuthServiceProvider` registers global CSRF verification after the session middleware (see [CSRF protection](#csrf-protection) above). Mutating requests without a valid token receive HTTP **419**.

### Secure session cookies

Set `SESSION_SECURE=true` in production so the session cookie includes the `Secure` attribute. Configure `sameSite` on the session block (`Lax`, `Strict`, or `None`).

### API token hardening

Personal access tokens use the `tyr_<secret>` format. Only a SHA-256 hash of the secret is stored; a short `token_prefix` is kept for log identification.

| Column | Purpose |
|--------|---------|
| `token_prefix` | First N characters of the plain token (safe to log) |
| `last_used_ip` | Updated on each bearer authentication |
| `revoked_at` | Soft revocation timestamp |
| `ip_whitelist` | Optional JSON array of allowed client IPs |
| `expires_at` | Optional expiry |

```typescript
const token = await Auth.createToken('mobile', ['posts:read'], {
  expiresIn: '30d',
  ipWhitelist: ['203.0.113.0'],
});
await Auth.revokeToken(token.id);
await Auth.revokeAllTokens();
```

Bearer authentication sets `request.tokenId` and `request.tokenAbilities` for ability middleware.

### Password reset

Reset tokens are compared with timing-safe equality. The auth scaffold does not return the raw reset token in API responses — tokens are delivered out-of-band (e.g. email).

### Guest middleware

The `guest` middleware respects the configured guard name and only redirects authenticated users on that guard.

## Post-quantum crypto

Session encryption at rest and ML-DSA OAuth token signing are documented in the dedicated [Post-quantum cryptography](/guide/crypto) guide.

Quick setup:

1. Add `config/crypto.ts`
2. Enable `SESSION_ENCRYPT` and/or `OAUTH_SIGN_TOKENS`
3. Generate keys with `pondoknusa crypto:generate-keys`

## Policies

Map models to policy classes in `config/auth.ts` and authorize in controllers or form requests with `Gate` / `authorizePolicy()`.