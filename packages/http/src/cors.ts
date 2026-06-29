import type { PondoknusaRequest } from './request.js';
import type { Middleware } from './types.js';

const WebResponse = globalThis.Response;
type WebResponse = globalThis.Response;

export interface CorsOptions {
  origins: string[] | '*';
  methods?: string[];
  headers?: string[];
  credentials?: boolean;
}

const DEFAULT_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
const DEFAULT_HEADERS = ['Content-Type', 'Authorization'];

export function createCorsMiddleware(options: CorsOptions): Middleware {
  const methods = (options.methods ?? DEFAULT_METHODS).join(', ');
  const headers = (options.headers ?? DEFAULT_HEADERS).join(', ');

  return async (request, next) => {
    const origin = request.header('origin');
    const allowOrigin = resolveAllowOrigin(options.origins, origin);

    if (request.method === 'OPTIONS') {
      return applyCorsHeaders(
        new WebResponse(null, { status: 204 }),
        allowOrigin,
        methods,
        headers,
        options.credentials ?? false,
      );
    }

    const response = await next();
    return applyCorsHeaders(
      response,
      allowOrigin,
      methods,
      headers,
      options.credentials ?? false,
    );
  };
}

function resolveAllowOrigin(
  origins: string[] | '*',
  requestOrigin: string | undefined,
): string | null {
  if (origins === '*') {
    return '*';
  }

  if (!requestOrigin) {
    return null;
  }

  return origins.includes(requestOrigin) ? requestOrigin : null;
}

function applyCorsHeaders(
  response: WebResponse,
  allowOrigin: string | null,
  methods: string,
  headers: string,
  credentials: boolean,
): WebResponse {
  if (!allowOrigin) {
    return response;
  }

  const next = new WebResponse(response.body, response);
  next.headers.set('Access-Control-Allow-Origin', allowOrigin);
  next.headers.set('Access-Control-Allow-Methods', methods);
  next.headers.set('Access-Control-Allow-Headers', headers);

  if (credentials) {
    next.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return next;
}