import { afterEach, beforeEach } from 'vitest';
import type { TestCase } from './test-case.js';

/**
 * Bind Pondoknusa TestCase lifecycle to Vitest hooks and return the shared instance.
 *
 * ```ts
 * class AppTest extends TestCase { ... }
 * const t = withPondoknusaTest(AppTest);
 *
 * it('hits home', async () => {
 *   await t.http.get('http://localhost/').assertOk();
 * });
 * ```
 */
export function withPondoknusaTest<T extends TestCase>(
  CaseClass: new () => T,
): T {
  const instance = new CaseClass();

  beforeEach(async () => {
    await instance.setUp();
  });

  afterEach(async () => {
    await instance.tearDown();
  });

  return instance;
}