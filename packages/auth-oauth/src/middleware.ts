import type { Middleware } from '@tyravel/http';
import { AuthenticationException } from '@tyravel/auth';
import type { OAuthServer } from './oauth-server.js';

export function createOAuth2AuthMiddleware(server: OAuthServer): Middleware {
  return async (request, next) => {
    const header = request.header('authorization');
    if (!header?.toLowerCase().startsWith('bearer ')) {
      throw new AuthenticationException();
    }

    const bearer = header.slice(7).trim();
    const resolved = await server.resolveAccessToken(bearer);
    if (!resolved) {
      throw new AuthenticationException();
    }

    const user = await server.resolveUserForToken(resolved);
    if (user) {
      request.user = user;
    }

    request.tokenAbilities = resolved.scopes;
    request.tokenId = resolved.id;

    return next();
  };
}