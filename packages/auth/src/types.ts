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
  driver?: string;
  teamId?: string;
  keyId?: string;
  privateKey?: string;
}

export type SessionDriver = 'array' | 'database' | 'redis';

export interface AuthSessionConfig {
  driver?: SessionDriver;
  cookie: string;
  lifetimeMinutes: number;
  secure?: boolean;
  sameSite?: 'Lax' | 'Strict' | 'None';
  table?: string;
  connection?: string;
  redisConnection?: string;
  prefix?: string;
}

export interface AuthConfig {
  defaults: {
    guard: string;
  };
  guards: Record<string, GuardConfig>;
  providers: Record<string, EloquentUserProviderConfig>;
  session: AuthSessionConfig;
  passwords?: Record<string, PasswordBrokerConfig>;
  oauth?: {
    providers: Record<string, OAuthProviderConfig>;
    accountsTable?: string;
    connection?: string;
  };
  policies?: Record<string, PolicyConstructor>;
  tokens?: TokenRepositoryConfig;
}

export interface Guard {
  readonly name: string;
  setRequest(request: TyravelRequest): void;
  user(): Authenticatable | null;
  id(): string | number | null;
  check(): boolean | Promise<boolean>;
}

export type PolicyConstructor = Constructor<Policy>;

export interface CreateTokenOptions {
  expiresIn?: string | number | Date;
  ipWhitelist?: string[];
}

export interface NewAccessToken {
  id: number;
  plainTextToken: string;
  tokenPrefix: string;
  name: string;
  abilities: string[];
  expiresAt: Date | null;
}

export interface TokenRepositoryConfig {
  table: string;
  connection?: string;
  prefix?: string;
  prefixLength?: number;
}