import { describe, expect, it } from 'vitest';
import { TyravelRequest } from './request.js';

describe('TyravelRequest', () => {
  it('reads page and per_page query parameters', () => {
    const request = new TyravelRequest(
      new Request('http://localhost/users?page=3&per_page=25'),
    );

    expect(request.page()).toBe(3);
    expect(request.perPage()).toBe(25);
    expect(request.page('page', 1)).toBe(3);
    expect(request.perPage('per_page', 15, 20)).toBe(20);
  });

  it('falls back when query values are invalid', () => {
    const request = new TyravelRequest(
      new Request('http://localhost/users?page=0&per_page=-5'),
    );

    expect(request.page()).toBe(1);
    expect(request.perPage()).toBe(15);
  });

  it('reinitializes and clears mutable request state', () => {
    const request = new TyravelRequest(new Request('http://localhost/a'), { id: '1' }, 'a.show');
    request.user = { id: 42 };
    request.locale = 'en';

    request.reinitialize(new Request('http://localhost/b'), { id: '2' }, 'b.show');

    expect(request.path).toBe('/b');
    expect(request.param('id')).toBe('2');
    expect(request.routeName).toBe('b.show');
    expect(request.user).toBeNull();
    expect(request.locale).toBeUndefined();
  });

  it('resolves ip and secure state from trusted proxy headers', () => {
    const request = new TyravelRequest(
      new Request('http://localhost/users', {
        headers: {
          'x-forwarded-for': '203.0.113.10, 10.0.0.1',
          'x-forwarded-proto': 'https',
        },
      }),
    );

    request.setTrustedProxies(['10.0.0.1']);
    expect(request.ip()).toBe('203.0.113.10');
    expect(request.secure()).toBe(true);
  });
});