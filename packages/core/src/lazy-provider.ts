import type { Abstract } from '@pondoknusa/container';
import type { Application } from './application.js';
import type { ServiceProvider } from './service-provider.js';

export type ProviderConstructor = new (app: Application) => ServiceProvider;

export type LazyRoutePrefixResolver =
  | string[]
  | ((app: Application) => string[]);

export interface LazyProviderRegistration {
  provider: ProviderConstructor;
  routePrefixes?: LazyRoutePrefixResolver;
  bootWhen?: (app: Application) => boolean;
  commands?: string[];
  bindings?: Abstract[];
}

export function normalizePathPrefix(prefix: string): string {
  const normalized = prefix.startsWith('/') ? prefix : `/${prefix}`;
  return normalized.replace(/\/+$/, '') || '/';
}

export function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  const normalized = normalizePathPrefix(prefix);
  if (normalized === '/') {
    return pathname === '/';
  }

  return pathname === normalized || pathname.startsWith(`${normalized}/`);
}

export function resolveLazyRoutePrefixes(
  app: Application,
  prefixes?: LazyRoutePrefixResolver,
): string[] {
  if (!prefixes) {
    return [];
  }

  return typeof prefixes === 'function' ? prefixes(app) : prefixes;
}

export function bindingMatches(requested: Abstract, registered: Abstract): boolean {
  if (requested === registered) {
    return true;
  }

  if (typeof requested === 'string' && typeof registered === 'string') {
    return requested === registered;
  }

  if (typeof requested === 'function' && typeof registered === 'function') {
    return requested === registered || requested.name === registered.name;
  }

  return false;
}