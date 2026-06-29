import { createHash } from 'node:crypto';
import type { PondoknusaRequest } from './request.js';
import type { Middleware } from './types.js';

const WebResponse = globalThis.Response;

export interface HttpCacheOptions {
  maxAge?: number;
  privacy?: 'public' | 'private';
  etag?: (request: PondoknusaRequest, body: string) => string | Promise<string>;
}

export function createHttpCacheMiddleware(options: HttpCacheOptions = {}): Middleware {
  const maxAge = options.maxAge ?? 60;
  const privacy = options.privacy ?? 'private';

  return async (request, next) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return next();
    }

    const response = await next();
    if (response.status < 200 || response.status >= 300) {
      return response;
    }

    const body = request.method === 'HEAD' ? '' : await response.clone().text();
    const etag = options.etag
      ? await options.etag(request, body)
      : createHash('sha256').update(body).digest('hex');

    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === `"${etag}"`) {
      return new WebResponse(null, {
        status: 304,
        headers: {
          etag: `"${etag}"`,
          'cache-control': `${privacy}, max-age=${maxAge}`,
        },
      });
    }

    const headers = new Headers(response.headers);
    headers.set('etag', `"${etag}"`);
    headers.set('cache-control', `${privacy}, max-age=${maxAge}`);

    return new WebResponse(request.method === 'HEAD' ? null : body, {
      status: response.status,
      headers,
    });
  };
}