import type { Application } from './application.js';
import type { AuthManager } from '@pondoknusa/auth';
import type { Authenticatable, CreateTokenOptions, NewAccessToken } from '@pondoknusa/auth';
import { PersonalAccessTokenRepository } from '@pondoknusa/auth';

let authApplication: Application | undefined;

export function setAuthApplication(app: Application): void {
  authApplication = app;
}

function resolveAuth(): AuthManager {
  if (!authApplication) {
    throw new Error(
      'Auth facade requires an application. Call setAuthApplication(app) during bootstrap.',
    );
  }

  return authApplication.make<AuthManager>('auth');
}

function resolveTokens(): PersonalAccessTokenRepository {
  if (!authApplication) {
    throw new Error('Auth tokens require setAuthApplication(app) during bootstrap.');
  }

  return authApplication.make<PersonalAccessTokenRepository>('auth.tokens');
}

function resolveCurrentUser(): Authenticatable {
  const user = resolveAuth().user('api') ?? resolveAuth().user();
  if (!user) {
    throw new Error('This action requires an authenticated user.');
  }

  return user;
}

export interface AuthFacade {
  user(guard?: string): Authenticatable | null;
  id(guard?: string): string | number | null;
  check(guard?: string): Promise<boolean>;
  attempt(credentials: Record<string, string>): Promise<boolean>;
  login(user: Authenticatable): Promise<void>;
  logout(): Promise<void>;
  createToken(
    name: string,
    abilities?: string[],
    options?: CreateTokenOptions,
  ): Promise<NewAccessToken>;
  revokeToken(tokenId: number): Promise<boolean>;
  revokeAllTokens(userId?: number): Promise<number>;
}

export const Auth: AuthFacade = {
  user: (guard) => resolveAuth().user(guard),
  id: (guard) => resolveAuth().id(guard),
  check: (guard) => resolveAuth().check(guard),
  attempt: (credentials) => resolveAuth().attempt(credentials),
  login: (user) => resolveAuth().login(user),
  logout: () => resolveAuth().logout(),
  createToken: async (name, abilities, options) => {
    const user = resolveCurrentUser();
    return resolveTokens().createToken(user, name, abilities, options);
  },
  revokeToken: async (tokenId) => {
    const user = resolveCurrentUser();
    return resolveTokens().revokeToken(tokenId, Number(user.getAuthIdentifier()));
  },
  revokeAllTokens: async (userId) => {
    const resolvedUserId =
      userId ?? Number(resolveCurrentUser().getAuthIdentifier());
    return resolveTokens().revokeTokensForUser(resolvedUserId);
  },
};