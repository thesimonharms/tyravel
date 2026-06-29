# Routing

Routes are defined with the `Route` facade:

```typescript
import { Route } from '@pondoknusa/core';
import { Response } from '@pondoknusa/http';
import { UserController } from '../controllers/user-controller.js';

Route.get('/', (request) =>
  Response.json({ message: 'Welcome', path: request.path }),
);

Route.prefix('api')
  .middleware('auth:api')
  .group(() => {
    Route.get('/users', [UserController, 'index']);
    Route.get('/users/:id', [UserController, 'show']).name('users.show');
  });
```

## Route parameters

```typescript
Route.get('/posts/:slug', (request) => {
  const slug = request.param('slug');
  return Response.json({ slug });
});
```

## Named routes

Name routes for URL generation and testing:

```typescript
Route.get('/users', handler).name('users.index');
```

## Middleware

Register aliases on the application, then attach them to routes or groups:

```typescript
app.middleware('auth', createAuthMiddleware(auth));

Route.middleware('auth').get('/profile', handler);
```

Global middleware runs on every request — session middleware is registered this way by `AuthServiceProvider`.