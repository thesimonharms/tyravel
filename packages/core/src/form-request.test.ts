import { describe, expect, it } from 'vitest';
import { AuthorizationException } from '@tyravel/auth';
import { TyravelRequest } from '@tyravel/http';
import { ValidationException } from '@tyravel/validation';
import { Application } from './application.js';
import { FormRequest } from './form-request.js';

function jsonRequest(
  body: Record<string, unknown>,
  user: { id: number } | null = null,
): TyravelRequest {
  const request = new TyravelRequest(
    new Request('http://localhost/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
  request.user = user;
  return request;
}

class StoreUserRequest extends FormRequest<{ email: string; name: string }> {
  override authorize(): boolean {
    return this.user() !== null;
  }

  rules() {
    return {
      email: ['required', 'email'],
      name: ['required', 'min_length:2'],
    };
  }
}

class OpenRequest extends FormRequest<{ title: string }> {
  rules() {
    return {
      title: 'required',
    };
  }
}

describe('FormRequest', () => {
  it('validates request data and exposes validated input', async () => {
    const app = new Application();
    const request = jsonRequest({ email: 'user@example.com', name: 'Ada' }, { id: 1 });

    const form = await app.make(StoreUserRequest).prepare(request, app);

    expect(form.validated()).toEqual({
      email: 'user@example.com',
      name: 'Ada',
    });
    expect(form.input('email')).toBe('user@example.com');
    expect(form.only('email')).toEqual({ email: 'user@example.com' });
    expect(form.except('name')).toEqual({ email: 'user@example.com' });
  });

  it('throws ValidationException when rules fail', async () => {
    const app = new Application();
    const request = jsonRequest({ email: 'not-an-email' }, { id: 1 });

    await expect(app.make(StoreUserRequest).prepare(request, app)).rejects.toBeInstanceOf(
      ValidationException,
    );
  });

  it('throws AuthorizationException when authorize returns false', async () => {
    const app = new Application();
    const request = jsonRequest({ email: 'user@example.com', name: 'Ada' });

    await expect(app.make(StoreUserRequest).prepare(request, app)).rejects.toBeInstanceOf(
      AuthorizationException,
    );
  });

  it('allows requests when authorize is not overridden', async () => {
    const app = new Application();
    const request = jsonRequest({ title: 'Hello' });

    const form = await app.make(OpenRequest).prepare(request, app);
    expect(form.validated()).toEqual({ title: 'Hello' });
  });
});