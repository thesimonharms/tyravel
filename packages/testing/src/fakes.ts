import type { Abstract } from '@pondoknusa/container';
import type { Application } from '@pondoknusa/core';
import { vi } from 'vitest';

/**
 * Replace a container binding with a test double for the duration of a test.
 */
export function fake<T>(
  app: Application,
  abstract: Abstract<T>,
  instance: T,
): T {
  app.instance(abstract, instance);
  return instance;
}

/**
 * Build a plain object with vitest mock functions for the given method names.
 */
export function mockInstance<T extends object>(methods: (keyof T)[]): T {
  const obj: Record<string, unknown> = {};
  for (const method of methods) {
    obj[method as string] = vi.fn();
  }
  return obj as T;
}

/**
 * Spy on an existing container binding (re-binds as singleton mock wrapper).
 */
export function spyOnBinding<T extends object>(
  app: Application,
  abstract: Abstract<T>,
  method: keyof T,
): ReturnType<typeof vi.fn> {
  const original = app.make(abstract);
  const spy = vi.spyOn(original, method as never);
  app.instance(abstract, original);
  return spy as ReturnType<typeof vi.fn>;
}