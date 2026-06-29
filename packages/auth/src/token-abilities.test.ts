import { describe, expect, it } from 'vitest';
import { PondoknusaRequest } from '@pondoknusa/http';
import { AuthorizationException } from './authorization-exceptions.js';
import { createTokenAbilityMiddleware } from './auth-manager.js';
import { parseTokenAbilities, tokenCan, tokenCanAny } from './token-abilities.js';

describe('token abilities helpers', () => {
  it('grants all abilities when wildcard is present', () => {
    expect(tokenCan('posts:write', ['*'])).toBe(true);
    expect(tokenCanAny('posts:write', ['*'])).toBe(true);
  });

  it('requires exact ability matches', () => {
    expect(tokenCan('posts:write', ['posts:read'])).toBe(false);
    expect(tokenCanAny('posts:write', ['posts:write'])).toBe(true);
    expect(tokenCanAny(['posts:read', 'posts:write'], ['posts:read', 'posts:write'])).toBe(
      true,
    );
  });

  it('parses stored abilities JSON', () => {
    expect(parseTokenAbilities('["posts:read"]')).toEqual(['posts:read']);
    expect(parseTokenAbilities('invalid')).toEqual(['*']);
  });
});

describe('createTokenAbilityMiddleware', () => {
  it('throws when required abilities are missing', async () => {
    const middleware = createTokenAbilityMiddleware('posts:write');
    const request = new PondoknusaRequest(new Request('http://localhost/api/posts'));
    request.tokenAbilities = ['posts:read'];

    await expect(middleware(request, async () => new Response('ok'))).rejects.toBeInstanceOf(
      AuthorizationException,
    );
  });

  it('allows requests with the required ability', async () => {
    const middleware = createTokenAbilityMiddleware('posts:write');
    const request = new PondoknusaRequest(new Request('http://localhost/api/posts'));
    request.tokenAbilities = ['posts:write'];

    const response = await middleware(request, async () => new Response('ok'));
    expect(await response.text()).toBe('ok');
  });
});