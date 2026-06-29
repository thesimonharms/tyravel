import { timingSafeEqual } from 'node:crypto';
import {
  cachedFormData,
  HttpException,
  withMiddlewareMeta,
  type Middleware,
  type PondoknusaRequest,
} from '@pondoknusa/http';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export class VerifyCsrfTokenException extends HttpException {
  constructor(message = 'CSRF token mismatch.') {
    super(message, 419);
    this.name = 'VerifyCsrfTokenException';
  }
}

export interface VerifyCsrfTokenOptions {
  except?: string[];
}

export function createVerifyCsrfTokenMiddleware(
  options: VerifyCsrfTokenOptions = {},
): Middleware {
  const except = options.except ?? [];

  return withMiddlewareMeta(async (request, next) => {
    if (SAFE_METHODS.has(request.method)) {
      return next();
    }

    if (isExcepted(request.path, except)) {
      return next();
    }

    const sessionToken = request.session?.get<string>('_csrf_token');
    if (!sessionToken) {
      throw new VerifyCsrfTokenException();
    }

    const submitted = await readSubmittedToken(request);
    if (!submitted || !tokensMatch(sessionToken, submitted)) {
      throw new VerifyCsrfTokenException();
    }

    return next();
  }, { tag: 'csrf' });
}

function readSubmittedToken(request: PondoknusaRequest): Promise<string | undefined> {
  const header = request.header('x-csrf-token') ?? request.header('X-CSRF-TOKEN');
  if (header) {
    return Promise.resolve(header);
  }

  const cached = cachedFormData(request)?.get('_token');
  if (typeof cached === 'string') {
    return Promise.resolve(cached);
  }

  return request.input<string>('_token');
}

function tokensMatch(expected: string, submitted: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(submitted, 'utf8');
  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}

function isExcepted(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => matchPattern(path, pattern));
}

function matchPattern(path: string, pattern: string): boolean {
  const regex = new RegExp(
    `^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`,
  );
  return regex.test(path);
}