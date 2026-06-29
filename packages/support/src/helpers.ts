import { collect, Collection } from '@pondoknusa/collection';

/* ──── Time ──────────────────────────────────────────────────────────── */

/** Current date/time. */
export function now(): Date {
  return new Date();
}

/** Today's date as YYYY-MM-DD string. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ──── Collection ────────────────────────────────────────────────────── */

/** Create a new Collection from an array. */
export { collect };

/* ──── Error handling ────────────────────────────────────────────────── */

/** Try `fn()`, return its result. If it throws, return `fallback`. */
export function rescue<T>(fn: () => T, fallback?: T): T | undefined {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/** Retry `fn` up to `times` with an optional delay (ms) between attempts. */
export async function retry<T>(
  times: number,
  fn: () => Promise<T> | T,
  delayMs = 0,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= times; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < times && delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastError;
}

/** Log an error to the console (replaces Laravel's `report()`). */
export function report(error: unknown): void {
  console.error(error);
}

/* ──── Conditionals ──────────────────────────────────────────────────── */

/** Throw `exception` when `condition` is truthy. */
export function throw_if(condition: unknown, exception: Error): asserts condition is false {
  if (condition) throw exception;
}

/** Throw `exception` when `condition` is falsy. */
export function throw_unless(
  condition: unknown,
  exception: Error,
): asserts condition {
  if (!condition) throw exception;
}

/* ──── Value manipulation ────────────────────────────────────────────── */

/** If `value` is a function, call it. Otherwise return it. */
export function value<T>(value: T | (() => T)): T {
  return typeof value === 'function' ? (value as () => T)() : value;
}

/** Pass `value` through `fn`, return `value` unchanged (side-effect chain). */
export function withValue<T>(value: T, fn: (value: T) => void): T {
  fn(value);
  return value;
}

/** Transform value if not null/undefined, else return fallback. */
export function transform<T, U>(
  value: T | null | undefined,
  fn: (value: T) => U,
  fallback?: U,
): U | undefined {
  if (value != null) return fn(value);
  return fallback;
}

/** Null-safe property access. */
export function optional<T, K extends keyof T>(
  obj: T | null | undefined,
  key?: K,
): T | T[K] | undefined {
  if (obj == null) return undefined;
  if (key !== undefined) return obj[key];
  return obj;
}

/* ──── Array helpers ─────────────────────────────────────────────────── */

/** First element of an array. */
export function head<T>(arr: T[]): T | undefined {
  return arr[0];
}

/** Last element of an array. */
export function last<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}

/* ──── Debug ─────────────────────────────────────────────────────────── */

/** Dump values to console and halt. */
export function dd(...args: unknown[]): never {
  // eslint-disable-next-line no-console
  console.log(...args);
  // eslint-disable-next-line no-process-exit
  process.exit(1);
}

/** Dump values to console and continue. */
export function dump(...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.log(...args);
}

/* ──── Path resolution ───────────────────────────────────────────────── */

/** Resolve a path relative to the project root. */
export function base_path(path = ''): string {
  // In a Pondoknusa app, the cwd is the project root
  return path ? `${process.cwd()}/${path}` : process.cwd();
}

/** Resolve a path relative to the app directory. */
export function app_path(path = ''): string {
  return base_path(`app${path ? `/${path}` : ''}`);
}

/** Resolve a path relative to the config directory. */
export function config_path(path = ''): string {
  return base_path(`config${path ? `/${path}` : ''}`);
}

/** Resolve a path relative to the database directory. */
export function database_path(path = ''): string {
  return base_path(`database${path ? `/${path}` : ''}`);
}

/** Resolve a path relative to the storage directory. */
export function storage_path(path = ''): string {
  return base_path(`storage${path ? `/${path}` : ''}`);
}

/** Resolve a path relative to the public directory. */
export function public_path(path = ''): string {
  return base_path(`public${path ? `/${path}` : ''}`);
}

/** Resolve a path relative to the resources directory. */
export function resource_path(path = ''): string {
  return base_path(`resources${path ? `/${path}` : ''}`);
}

/* ──── Reflection ────────────────────────────────────────────────────── */

/** Get the class basename from an object or class. */
export function class_basename(objOrClass: object | (new (...args: unknown[]) => unknown)): string {
  const name =
    typeof objOrClass === 'function'
      ? objOrClass.name
      : objOrClass.constructor?.name;
  return name || '';
}
