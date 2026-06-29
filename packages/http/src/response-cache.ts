import { createHash } from 'node:crypto';
import type { PondoknusaRequest } from './request.js';
import type { Middleware } from './types.js';

const WebResponse = globalThis.Response;

export interface ResponseCacheStore {
  get<T = unknown>(key: string): Promise<T | null>;
  put(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
}

export interface CachedHttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface ResponseCacheOptions {
  cache: ResponseCacheStore;
  ttlSeconds?: number;
  prefix?: string;
  /** Skip cache for authenticated requests (default true). */
  anonymousOnly?: boolean;
  /** Include selected request headers in the cache key. */
  vary?: string[];
  cacheKey?: (request: PondoknusaRequest) => string;
  shouldCache?: (request: PondoknusaRequest, response: Response) => boolean;
  isAuthenticated?: (request: PondoknusaRequest) => boolean;
}

function defaultCacheKey(request: PondoknusaRequest, vary: string[]): string {
  const url = request.url;
  const parts = [request.method, url.pathname, url.search];

  for (const header of vary) {
    parts.push(request.headers.get(header) ?? '');
  }

  return createHash('sha256').update(parts.join('|')).digest('hex');
}

function isRequestAuthenticated(
  request: PondoknusaRequest,
  isAuthenticated?: (request: PondoknusaRequest) => boolean,
): boolean {
  if (isAuthenticated) {
    return isAuthenticated(request);
  }

  return request.user != null;
}

function shouldStoreResponse(response: Response): boolean {
  return response.status >= 200 && response.status < 300;
}

function headersToRecord(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

function rebuildResponse(cached: CachedHttpResponse, method: string): Response {
  const headers = new Headers(cached.headers);
  headers.set('x-pondoknusa-cache', 'HIT');

  return new WebResponse(method === 'HEAD' ? null : cached.body, {
    status: cached.status,
    headers,
  });
}

export function createResponseCacheMiddleware(
  options: ResponseCacheOptions,
): Middleware {
  const ttlSeconds = options.ttlSeconds ?? 60;
  const prefix = options.prefix ?? 'http:response';
  const anonymousOnly = options.anonymousOnly ?? true;
  const vary = options.vary ?? [];

  return async (request, next) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return next();
    }

    if (anonymousOnly && isRequestAuthenticated(request, options.isAuthenticated)) {
      return next();
    }

    const keySuffix = options.cacheKey
      ? options.cacheKey(request)
      : defaultCacheKey(request, vary);
    const cacheKey = `${prefix}:${keySuffix}`;

    const cached = await options.cache.get<CachedHttpResponse>(cacheKey);
    if (cached) {
      return rebuildResponse(cached, request.method);
    }

    const response = await next();

    const allowCache = options.shouldCache
      ? options.shouldCache(request, response)
      : shouldStoreResponse(response);

    if (!allowCache) {
      return response;
    }

    const body = request.method === 'HEAD' ? '' : await response.clone().text();
    const payload: CachedHttpResponse = {
      status: response.status,
      headers: headersToRecord(response.headers),
      body,
    };

    await options.cache.put(cacheKey, payload, ttlSeconds);

    const headers = new Headers(response.headers);
    headers.set('x-pondoknusa-cache', 'MISS');

    return new WebResponse(request.method === 'HEAD' ? null : body, {
      status: response.status,
      headers,
    });
  };
}