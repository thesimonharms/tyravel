# Service container

The IoC container is the heart of every Tyravel application. It manages class dependencies and performs dependency injection.

## Binding

### `bind`

Register a factory or constructor that creates a new instance every time:

```typescript
import { Container } from '@tyravel/container';

const container = new Container();

// Factory function
container.bind('mailer', () => new SmtpMailer(config));

// Constructor — resolved through the container
container.bind(PaymentGateway, StripePaymentGateway);
```

Each call to `make()` returns a fresh instance.

### `singleton`

Register a binding that returns the same instance on every resolution:

```typescript
container.singleton('cache', () => new CacheManager());

const a = container.make('cache');
const b = container.make('cache');
// a === b — same instance
```

### `instance`

Register an existing object as a singleton:

```typescript
const config = new ConfigRepository();
container.instance('config', config);
```

### `alias`

Create an alias for an existing binding:

```typescript
container.singleton(PaymentGateway, StripePaymentGateway);
container.alias(PaymentGateway, 'payment-gateway');

// Both resolve to the same singleton
container.make(PaymentGateway);
container.make('payment-gateway');
```

## Resolution

### `make`

Resolve a binding by abstract, class, or alias:

```typescript
const mailer = container.make<Mailer>('mailer');
const gateway = container.make(PaymentGateway);
```

Throws `BindingResolutionException` if the abstract is not bound and is not a concrete class.

### `call`

Invoke a function with dependency injection from named parameters:

```typescript
function sendEmail(to: string, from: string) {
  // ...
}

container.call(sendEmail, { to: 'ada@example.com', from: 'system@example.com' });
```

## Container API

| Method | Description |
|--------|-------------|
| `bind(abstract, factory)` | Register a factory — new instance each time |
| `singleton(abstract, factory)` | Register a shared instance |
| `instance(abstract, value)` | Register an existing object |
| `alias(abstract, alias)` | Create an alias for a binding |
| `make(abstract)` | Resolve a binding |
| `call(fn, params)` | Call a function with injected parameters |
| `flush()` | Clear all singleton instances (resets resolved state) |

## In the application

When you use `Application` (from `@tyravel/core`), the container is already wired:

```typescript
const app = new Application();
app.register(ConfigServiceProvider);

// App's register() method uses app.bind/app.singleton/app.instance internally
app.register(AuthServiceProvider);

await app.boot();
```

`app.make()`, `app.bind()`, `app.singleton()`, `app.instance()`, `app.alias()` all delegate to the underlying `Container` instance.

## Abstract types

The container supports these abstract types for bindings:

```typescript
type Abstract<T = unknown> =
  | string             // 'mailer'
  | symbol             // Symbol('mailer')
  | Constructor<T>     // class Mailer {}
  | { new (...args: unknown[]): T };  // any constructor
```

Use string keys for simple bindings and constructor references for type-safe resolution.