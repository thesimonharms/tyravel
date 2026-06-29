# Multi-tenant apps

Isolate tenant data in a shared database using request-scoped context and model global scopes.

Pondoknusa does not ship a built-in tenancy package — this recipe uses middleware, the container, and ORM scopes you control.

## 1. Tenant resolution middleware

Resolve the tenant from subdomain or header and store it on the request container:

```typescript
// src/middleware/resolve-tenant.ts
import type { Middleware } from '@pondoknusa/http';

export interface Tenant {
  id: string;
  slug: string;
}

export const TENANT_KEY = 'tenant';

export function resolveTenant(): Middleware {
  return async (request, next) => {
    const host = request.header('host') ?? '';
    const slug = host.split('.')[0] ?? '';

    if (!slug || slug === 'www') {
      return Response.json({ error: 'Unknown tenant' }, { status: 404 });
    }

    const tenant = await lookupTenantBySlug(slug);
    if (!tenant) {
      return Response.json({ error: 'Unknown tenant' }, { status: 404 });
    }

    request.container.instance(TENANT_KEY, tenant);
    return next();
  };
}
```

Register on tenant-facing route groups:

```typescript
Route.middleware(['web', resolveTenant()]).group(() => {
  // tenant routes
});
```

## 2. Global scope on models

Add `tenant_id` to tenant-owned tables and scope queries automatically:

```typescript
import { Model, createGlobalScope } from '@pondoknusa/database';

export class Post extends Model {
  static table = 'posts';
}

Post.addGlobalScope(
  createGlobalScope('tenant', (builder) => {
    const tenant = currentTenant();
    if (tenant) {
      builder.where('tenant_id', tenant.id);
    }
  }),
);
```

Implement `currentTenant()` to read from async request context (e.g. `request.container.make(TENANT_KEY)` in middleware, or a small helper backed by `AsyncLocalStorage`).

## 3. Assign tenant on create

Set `tenant_id` with a model `creating` hook or in the controller so inserts never leak across tenants:

```typescript
export class Post extends Model {
  // ...

  async creating(): Promise<void> {
    this.setAttribute('tenant_id', currentTenant()!.id);
  }
}
```

## 4. Cache and storage prefixes

Prefix cache keys and disk paths per tenant to avoid collisions:

```typescript
const key = `tenant:${tenant.id}:dashboard-stats`;
await Cache.put(key, stats, 300);
```

For file uploads, use `storage/app/tenants/{tenantId}/...` paths.

## 5. Broadcasting channels

Namespace channels by tenant so Echo clients only subscribe to their org:

```typescript
Broadcast.channel('private-tenant.{tenantId}.orders', (user, tenantId) => {
  return user.tenantId === tenantId;
});
```

## Testing

Use `withSession()` and middleware that injects a fake tenant in feature tests. Assert cross-tenant access returns `404` or `403`, not another tenant's rows.

## Related

- [Database & ORM](/guide/database) — global scopes and model hooks
- [Authentication](/guide/auth) — attach `tenantId` to the user model
- [Broadcasting](/guide/broadcasting) — private channel naming