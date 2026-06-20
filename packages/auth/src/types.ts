import type { Model } from '@tyravel/database';
import type { TyravelRequest } from '@tyravel/http';
import type { Constructor } from '@tyravel/container';
import type { Policy } from './policy.js';

export interface Authenticatable {
  getAuthIdentifier(): string | number;
  getAuthPassword(): string;
}

export type UserModelConstructor = new (
  attributes?: Record<string, unknown>,
) => Model & Authenticatable;

export interface SessionGuardConfig {
  driver: 'session';
  provider: string;
}

export interface TokenGuardConfig {
  driver: 'token';
  provider: string;
  hashKey?: string;
}

export type GuardConfig = SessionGuardConfig | TokenGuardConfig;

export interface EloquentUserProviderConfig {
  driver: 'eloquent';
  model: UserModelConstructor;
}

export interface PasswordBrokerConfig {
  provider: string;
  table: string;
  expireMinutes: number;
  connection?: string;
}

export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
}

export interface AuthConfig {
  defaults: {
    guard: string;
  };
  guards: Record<string, GuardConfig>;
  providers: Record<string, EloquentUserProviderConfig>;
  session: {
    cookie: string;
    lifetimeMinutes: number;
    table: string;
    connection?: string;
  };
  passwords?: Record<string, PasswordBrokerConfig>;
  oauth?: {
    providers: Record<string, OAuthProviderConfig>;
    accountsTable?: string;
    connection?: string;
  };
  policies?: Record<string, PolicyConstructor>;
  tokens?: {
    table: string;
    connection?: string;
  };
}

export interface Guard {
  readonly name: string;
  setRequest(request: TyravelRequest): void;
  user(): Authenticatable | null;
  id(): string | number | null;
  check(): boolean | Promise<boolean>;
}

export type PolicyConstructor = Constructor<Policy>;

export interface NewAccessToken {
  plainTextToken: string;
  name: string;
  abilities: string[];
}