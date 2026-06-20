import { describe, expect, it } from 'vitest';
import { Response } from '@tyravel/http';
import type { TyravelRequest } from '@tyravel/http';
import { Application } from './application.js';
import { createControllerHandler } from './controller.js';
import { FormRequest } from './form-request.js';
import { HttpKernel } from './http-kernel.js';
import { Route, setRouteApplication } from './route.js';

class CreateUserRequest extends FormRequest<{ email: string }> {
  rules() {
    return {
      email: ['required', 'email'],
    };
  }
}

class UserController {
  index() {
    return Response.json({ users: [] });
  }

  show(request: TyravelRequest) {
    return Response.json({ id: request.param('id') });
  }

  store(form: CreateUserRequest) {
    return Response.json({ email: form.input('email') });
  }

  update(request: TyravelRequest, form: CreateUserRequest) {
    return Response.json({
      id: request.param('id'),
      email: form.input('email'),
    });
  }
}

describe('Controller resolution', () => {
  it('dispatches controller actions through the container', async () => {
    const app = new Application();
    setRouteApplication(app);

    Route.get('/users', [UserController, 'index']);
    Route.get('/users/:id', [UserController, 'show']);

    const kernel = new HttpKernel(app);
    const indexResponse = await kernel.handle(new Request('http://localhost/users'));
    const showResponse = await kernel.handle(
      new Request('http://localhost/users/7'),
    );

    expect(await indexResponse.json()).toEqual({ users: [] });
    expect(await showResponse.json()).toEqual({ id: '7' });
  });

  it('creates a route handler from a controller tuple', async () => {
    const app = new Application();
    const handler = createControllerHandler(app, [UserController, 'index']);
    const response = await handler(new Request('http://localhost') as never);

    expect(await response.json()).toEqual({ users: [] });
  });

  it('resolves and validates form requests from controller tuples', async () => {
    const app = new Application();
    setRouteApplication(app);

    Route.post('/users', [UserController, 'store', CreateUserRequest]);
    Route.put('/users/:id', [UserController, 'update', CreateUserRequest]);

    const kernel = new HttpKernel(app);
    const storeResponse = await kernel.handle(
      new Request('http://localhost/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'user@example.com' }),
      }),
    );
    const updateResponse = await kernel.handle(
      new Request('http://localhost/users/9', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'updated@example.com' }),
      }),
    );

    expect(await storeResponse.json()).toEqual({ email: 'user@example.com' });
    expect(await updateResponse.json()).toEqual({
      id: '9',
      email: 'updated@example.com',
    });
  });
});