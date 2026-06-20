import type { Application } from './application.js';
import type { AuthManager } from '@tyravel/auth';
import type { Authenticatable, NewAccessToken } from '@tyravel/auth';
import { PersonalAccessTokenRepository } from '@tyravel/auth';

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

export interface AuthFacade {
  user(guard?: string): Authenticatable | null;
  id(guard?: string): string | number | null;
  check(guard?: string): Promise<boolean>;
  attempt(credentials: Record<string, string>): Promise<boolean>;
  login(user: Authenticatable): Promise<void>;
  logout(): Promise<void>;
  createToken(name: string, abilities?: string[]): Promise<NewAccessToken>;
}

export const Auth: AuthFacade = {
  user: (guard) => resolveAuth().user(guard),
  id: (guard) => resolveAuth().id(guard),
  check: (guard) => resolveAuth().check(guard),
  attempt: (credentials) => resolveAuth().attempt(credentials),
  login: (user) => resolveAuth().login(user),
  logout: () => resolveAuth().logout(),
  createToken: async (name, abilities) => {
    const user = resolveAuth().user('api') ?? resolveAuth().user();
    if (!user) {
      throw new Error('Cannot create API token without an authenticated user.');
    }

    return resolveTokens().createToken(user, name, abilities);
  },
};