import type { Groupable, MiddlewareInput } from '@pondoknusa/http';

export interface LocalizedRouteGroupOptions {
  parameter?: string;
  middleware?: MiddlewareInput[];
}

export function localizedRouteGroup(
  routes: Groupable,
  options: LocalizedRouteGroupOptions,
  callback: (routes: Groupable) => void,
): void {
  const parameter = options.parameter ?? 'locale';
  const middleware = options.middleware ?? ['locale.fromRoute'];

  routes
    .prefix(`:${parameter}`)
    .middleware(...middleware)
    .group(callback);
}