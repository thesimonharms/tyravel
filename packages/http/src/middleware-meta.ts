import type { Middleware } from './types.js';

export type MiddlewareTag = 'session' | 'csrf' | 'locale' | 'view';

export interface MiddlewareMeta {
  tag?: MiddlewareTag;
}

const META_KEY = '__pondoknusaMiddlewareMeta';

export function withMiddlewareMeta<T extends Middleware>(
  middleware: T,
  meta: MiddlewareMeta,
): T {
  Object.defineProperty(middleware, META_KEY, {
    value: meta,
    enumerable: false,
    configurable: true,
  });
  return middleware;
}

export function getMiddlewareMeta(middleware: Middleware): MiddlewareMeta | undefined {
  return (middleware as { [META_KEY]?: MiddlewareMeta })[META_KEY];
}

export function middlewareHasTag(middleware: Middleware, tag: MiddlewareTag): boolean {
  return getMiddlewareMeta(middleware)?.tag === tag;
}