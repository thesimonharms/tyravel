import { Session } from '@pondoknusa/auth';
import type { Middleware } from '@pondoknusa/http';

export interface TestRequestContext {
  session?: Record<string, unknown>;
  user?: unknown;
  csrfToken?: string;
}

let activeContext: TestRequestContext = {};

export function setTestRequestContext(context: TestRequestContext): void {
  activeContext = context;
}

export function clearTestRequestContext(): void {
  activeContext = {};
}

export function getTestRequestContext(): TestRequestContext {
  return activeContext;
}

export function createTestingMiddleware(): Middleware {
  return async (request, next) => {
    if (activeContext.session) {
      request.session = new Session('testing', activeContext.session);
    }
    if (activeContext.user !== undefined) {
      request.user = activeContext.user;
    }
    return next();
  };
}