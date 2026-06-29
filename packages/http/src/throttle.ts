import { Response } from './response.js';
import type { PondoknusaRequest } from './request.js';
import type { Middleware } from './types.js';

export interface ThrottleOptions {
  limit: number;
  windowMs: number;
  key?: (request: PondoknusaRequest) => string;
}

interface ThrottleEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, ThrottleEntry>();

export function createThrottleMiddleware(options: ThrottleOptions): Middleware {
  return async (request, next) => {
    const key = options.key?.(request) ?? `${request.ip()}:${request.method}:${request.path}`;
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      store.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      return next();
    }

    if (entry.count >= options.limit) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      return Response.json(
        { message: 'Too many requests.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
          },
        },
      );
    }

    entry.count += 1;
    store.set(key, entry);
    return next();
  };
}

export function resetThrottleStore(): void {
  store.clear();
}

export interface ThrottlePresetMap {
  [preset: string]: ThrottleOptions;
}

export function throttleMiddlewareAlias(preset: string): string {
  return `throttle:${preset}`;
}

export function registerThrottlePresets(
  register: (name: string, middleware: Middleware) => void,
  presets: ThrottlePresetMap,
): void {
  for (const [name, options] of Object.entries(presets)) {
    register(throttleMiddlewareAlias(name), createThrottleMiddleware(options));
  }
}