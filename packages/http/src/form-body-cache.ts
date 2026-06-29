import type { PondoknusaRequest } from './request.js';
import type { Middleware } from './types.js';

function isFormContentType(contentType: string): boolean {
  return (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  );
}

/** Parsed form body for the current request, when the form-body cache middleware ran. */
export function cachedFormData(request: PondoknusaRequest): FormData | undefined {
  return request.getFormBodyCache();
}

/** Parse the request body once so CSRF and validation can both read form fields. */
export function createFormBodyCacheMiddleware(): Middleware {
  return async (request, next) => {
    const contentType = request.headers.get('content-type') ?? '';
    if (!isFormContentType(contentType)) {
      return next();
    }

    const parsed = await request.raw.formData();
    request.setFormBodyCache(parsed);

    return next();
  };
}