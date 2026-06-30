import type { PondoknusaRequest } from '@pondoknusa/http';
import type { Middleware } from '@pondoknusa/http';
import { Response, withMiddlewareMeta } from '@pondoknusa/http';

import { AuthorizationException } from './authorization-exceptions.js';
import { AuthenticationException } from './exceptions.js';
import { tokenCanAny } from './token-abilities.js';
import { SessionGuard } from './session-guard.js';
import type { TokenGuard } from './token-guard.js';
import type { Authenticatable, AuthConfig, Guard } from './types.js';

type WebResponse = globalThis.Response;

export class AuthManager {
  private readonly guards = new Map<string, Guard>();
  private readonly sessionGuardName: string;
  private defaultGuard: string;

  constructor(
    private readonly config: AuthConfig,
    guardFactories: Record<string, () => Guard>,
    sessionGuardName: string,
  ) {
    this.defaultGuard = config.defaults.guard;
    this.sessionGuardName = sessionGuardName;
    for (const [name, factory] of Object.entries(guardFactories)) {
      this.guards.set(name, factory());
    }
  }

  guard(name?: string): Guard {
    const guardName = name ?? this.defaultGuard;
    const guard = this.guards.get(guardName);
    if (!guard) {
      throw new Error(`Auth guard not configured: ${guardName}`);
    }
    return guard;
  }

  sessionGuard(): SessionGuard {
    const guard = this.guards.get(this.sessionGuardName);
    if (!guard || !(guard instanceof SessionGuard)) {
      throw new Error(`Session guard not configured: ${this.sessionGuardName}`);
    }
    return guard;
  }

  user(guardName?: string): Authenticatable | null {
    return this.guard(guardName).user();
  }

  id(guardName?: string): string | number | null {
    return this.guard(guardName).id();
  }

  async check(guardName?: string): Promise<boolean> {
    const result = this.guard(guardName).check();
    return result instanceof Promise ? result : result;
  }

  async attempt(
    credentials: Record<string, string>,
    guardName?: string,
  ): Promise<boolean> {
    const guard = this.sessionGuard();
    return guard.attempt(credentials);
  }

  async login(user: Authenticatable, guardName?: string): Promise<void> {
    if (guardName && guardName !== this.sessionGuardName) {
      throw new Error('Login is only supported on the session guard.');
    }
    await this.sessionGuard().login(user);
  }

  async logout(guardName?: string): Promise<void> {
    if (guardName && guardName !== this.sessionGuardName) {
      return;
    }
    await this.sessionGuard().logout();
  }

  primeRequest(request: PondoknusaRequest): void {
    for (const guard of this.guards.values()) {
      guard.setRequest(request);
    }
  }

  async startRequest(request: PondoknusaRequest): Promise<void> {
    this.primeRequest(request);

    await this.sessionGuard().startSession();

    for (const guard of this.guards.values()) {
      if ('authenticate' in guard && typeof guard.authenticate === 'function') {
        await (guard as TokenGuard).authenticate();
      }
    }
  }

  async endRequest(response: WebResponse): Promise<WebResponse> {
    return this.sessionGuard().persistSession(response);
  }
}

export function createAuthMiddleware(auth: AuthManager, guardName?: string): Middleware {
  return async (request, next) => {
    auth.primeRequest(request);

    const guard = auth.guard(guardName);
    const ok = guard.check();
    const authenticated = ok instanceof Promise ? await ok : ok;
    if (!authenticated) {
      throw new AuthenticationException();
    }

    request.user = guard.user();
    return next();
  };
}

export function createGuestMiddleware(auth: AuthManager, guardName?: string): Middleware {
  return async (request, next) => {
    const guard = auth.guard(guardName);
    const ok = guard.check();
    const authenticated = ok instanceof Promise ? await ok : ok;
    if (authenticated) {
      const accept = request.header('accept') ?? '';
      if (accept.includes('text/html') || !accept.includes('application/json')) {
        return Response.redirect('/dashboard', 302, request);
      }
      return Response.json({ message: 'Already authenticated.' }, { status: 409 });
    }

    return next();
  };
}

export function createTokenAbilityMiddleware(
  required: string | string[],
): Middleware {
  return async (request, next) => {
    if (!tokenCanAny(required, request.tokenAbilities)) {
      throw new AuthorizationException();
    }

    return next();
  };
}

export function createStartSessionMiddleware(auth: AuthManager): Middleware {
  return withMiddlewareMeta(async (request, next) => {
    await auth.startRequest(request);
    const response = await next();
    return auth.endRequest(response);
  }, { tag: 'session' });
}

export { SessionGuard } from './session-guard.js';