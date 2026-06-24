import { timingSafeEqual } from 'node:crypto';
import { HttpException } from '@tyravel/http';
import type { Middleware } from '@tyravel/http';
import type { TyravelRequest } from '@tyravel/http';

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

  return async (request, next) => {
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
  };
}

function readSubmittedToken(request: TyravelRequest): Promise<string | undefined> {
  const header = request.header('x-csrf-token') ?? request.header('X-CSRF-TOKEN');
  if (header) {
    return Promise.resolve(header);
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