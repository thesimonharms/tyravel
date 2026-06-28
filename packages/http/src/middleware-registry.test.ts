import { describe, expect, it } from 'vitest';
import type { Middleware } from './types.js';
import { MiddlewareRegistry } from './middleware-registry.js';

describe('MiddlewareRegistry', () => {
  it('caches resolved alias middleware', () => {
    const registry = new MiddlewareRegistry();

    const middleware: Middleware = async (_request, next) => next();
    Object.defineProperty(middleware, 'name', { value: 'cached' });

    registry.alias('cached', middleware);

    const first = registry.resolve('cached');
    const second = registry.resolve('cached');

    expect(first).toBe(second);
    expect(registry.resolve('cached')).toBe(first);
  });
});