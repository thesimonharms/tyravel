import { describe, expect, it } from 'vitest';
import { TyravelRequestPool } from './request-pool.js';

describe('TyravelRequestPool', () => {
  it('reuses request instances and resets mutable state', async () => {
    const pool = new TyravelRequestPool(4);
    const first = pool.acquire(new Request('http://localhost/a'), { id: '1' }, 'a.show');
    first.user = { id: 1 };
    first.locale = 'en';

    pool.release(first);
    expect(pool.size).toBe(1);

    const second = pool.acquire(new Request('http://localhost/b'), { id: '2' }, 'b.show');
    expect(second).toBe(first);
    expect(second.path).toBe('/b');
    expect(second.param('id')).toBe('2');
    expect(second.user).toBeNull();
    expect(second.session).toBeUndefined();
  });

  it('creates new instances when the pool is empty', () => {
    const pool = new TyravelRequestPool();
    const request = pool.acquire(new Request('http://localhost/'), {});
    expect(request.path).toBe('/');
    expect(pool.size).toBe(0);
  });
});