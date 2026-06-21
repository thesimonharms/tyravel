import { describe, expect, it } from 'vitest';
import { TyravelRequest } from '@tyravel/http';
import { validateRequest, ValidationException, Validator } from './validator.js';

describe('Validator', () => {
  it('validates required and email rules', () => {
    const result = new Validator(
      { email: 'user@example.com', name: 'Tyravel' },
      { email: 'required|email', name: 'required|max_length:50' },
    ).validate();

    expect(result.email).toBe('user@example.com');
  });

  it('throws a validation exception with field errors', () => {
    expect(() =>
      new Validator({ email: 'invalid' }, { email: 'required|email' }).validate(),
    ).toThrow(ValidationException);
  });

  it('validates json request bodies', async () => {
    const request = new TyravelRequest(
      new Request('http://localhost/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'user@example.com', age: 21 }),
      }),
    );

    const data = await validateRequest(request, {
      email: 'required|email',
      age: 'required|integer|min:18',
    });

    expect(data).toEqual({ email: 'user@example.com', age: 21 });
  });

  it('skips sometimes rules when a field is absent from the payload', () => {
    const result = new Validator<{ title?: string; body?: string; slug?: string }>(
      { title: 'Updated title' },
      {
        title: 'sometimes|string|max:255',
        body: 'sometimes|string|max:255',
        slug: 'sometimes|string|max:255',
      },
    ).validate();

    expect(result).toEqual({ title: 'Updated title' });
  });

  it('validates sometimes rules when a field is present', () => {
    expect(() =>
      new Validator(
        { title: 'x'.repeat(256) },
        { title: 'sometimes|string|max:255' },
      ).validate(),
    ).toThrow(ValidationException);

    const result = new Validator(
      { title: 'Valid title' },
      { title: 'sometimes|string|max:255' },
    ).validate();

    expect(result).toEqual({ title: 'Valid title' });
  });

  it('supports partial JSON updates through validateRequest', async () => {
    const request = new TyravelRequest(
      new Request('http://localhost/posts/1', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Only title changes' }),
      }),
    );

    const data = await validateRequest<{
      title?: string;
      body?: string;
      slug?: string;
    }>(request, {
      title: 'sometimes|string|max:255',
      body: 'sometimes|string|max:255',
      slug: 'sometimes|string|max:255',
    });

    expect(data).toEqual({ title: 'Only title changes' });
  });

  it('still requires fields without sometimes when they are absent', () => {
    expect(() =>
      new Validator<{ title?: string; body?: string }>(
        { title: 'Hello' },
        {
          title: 'sometimes|string|max:255',
          body: 'required|string',
        },
      ).validate(),
    ).toThrow(ValidationException);
  });

  it('treats explicit null as present for sometimes rules', () => {
    expect(() =>
      new Validator(
        { title: null },
        { title: 'sometimes|required|string' },
      ).validate(),
    ).toThrow(ValidationException);
  });
});