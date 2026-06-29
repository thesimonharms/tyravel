import type { AuthManager, Gate } from '@pondoknusa/auth';
import type { ModelStatic } from '@pondoknusa/database';
import type { Middleware } from '@pondoknusa/http';
import { AuthorizationException } from '@pondoknusa/auth';
import { authorizeAdminAccess } from './authorize.js';

export interface AdminMiddlewareOptions {
  gate: Gate;
  auth: AuthManager;
  ability?: string;
  policyModel?: ModelStatic;
}

export function createAdminMiddleware(options: AdminMiddlewareOptions): Middleware {
  const ability = options.ability ?? 'accessAdmin';

  return async (request, next) => {
    if (!options.auth.check()) {
      throw new AuthorizationException('Authentication required.');
    }

    await authorizeAdminAccess(
      options.gate,
      options.auth,
      ability,
      options.policyModel,
    );

    return next();
  };
}