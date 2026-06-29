# Admin panel

Add the optional Pondoknusa admin UI for CRUD, policies, and audit logging.

## Install

```bash
pondoknusa admin:install
```

Scaffolds:

- `config/admin.ts` — prefix, middleware, audit log
- Admin routes and policies
- `@pondoknusa/admin` provider registration

## Config

```typescript
// config/admin.ts
export default {
  enabled: env('ADMIN_ENABLED', true),
  prefix: env('ADMIN_PREFIX', '/admin'),
  middleware: ['web', 'auth'],
  accessAbility: 'access-admin',
  perPage: 25,
  auditLog: { enabled: true, table: 'admin_audit_log' },
};
```

Gate access with a policy ability (`access-admin`) on your user model.

## Usage

1. Register models you want to manage in the admin provider stub
2. Visit `/admin` (or your `prefix`) while authenticated with the ability
3. Audit entries land in `admin_audit_log` when enabled

## Testing

Use `@pondoknusa/testing` HTTP sugar:

```typescript
const response = await t.http
  .actingAs(adminUser)
  .get('http://localhost/admin');
await response.assertOk();
```

See `@pondoknusa/admin` in the [package reference](/reference/generated/packages/admin).