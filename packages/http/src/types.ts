import type { PondoknusaRequest } from './request.js';

export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'OPTIONS'
  | 'HEAD';

export type RouteParamValue = string | object;
export type RouteParams = Record<string, RouteParamValue>;

export type RouteHandler = (
  request: PondoknusaRequest,
) => Response | Promise<Response>;

export type Middleware = (
  request: PondoknusaRequest,
  next: () => Promise<Response>,
) => Promise<Response>;

export interface RouteDefinition {
  method: HttpMethod;
  pattern: string;
  handler: RouteHandler;
  handlerLabel?: string;
  name?: string;
  namePrefix?: string;
  middleware: Middleware[];
  middlewareLabels?: string[];
}