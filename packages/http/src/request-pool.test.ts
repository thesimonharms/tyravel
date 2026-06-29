import { describe, expect, it } from 'vitest';
import { PondoknusaRequestPool } from './request-pool.js';

describe('PondoknusaRequestPool', () => {
  it('reuses request instances and resets mutable state', async () => {
    const pool = new PondoknusaRequestPool(4);
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
    expect(second.getFormBodyCache()).toBeUndefined();
  });

  it('creates new instances when the pool is empty', () => {
    const pool = new PondoknusaRequestPool();
    const request = pool.acquire(new Request('http://localhost/'), {});
    expect(request.path).toBe('/');
    expect(pool.size).toBe(0);
  });
});