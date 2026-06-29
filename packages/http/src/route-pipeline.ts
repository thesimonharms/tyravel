import type { PondoknusaRequest } from './request.js';
import type { Middleware, RouteHandler } from './types.js';

/**
 * Pre-composed middleware runner with a stable `advance` callback per route
 * (no per-request closure allocation for the pipeline itself).
 */
export class RoutePipelineRunner {
  private request!: PondoknusaRequest;
  private index = 0;

  constructor(
    private readonly middleware: Middleware[],
    private readonly handler: RouteHandler,
  ) {}

  private readonly advance = (): Promise<Response> => {
    if (this.index < this.middleware.length) {
      const current = this.middleware[this.index++]!;
      return current(this.request, this.advance);
    }

    return Promise.resolve(this.handler(this.request));
  };

  run(request: PondoknusaRequest): Promise<Response> {
    this.request = request;
    this.index = 0;

    if (this.middleware.length === 0) {
      const result = this.handler(request);
      return result instanceof Promise ? result : Promise.resolve(result);
    }

    return this.advance();
  }
}

export function createRoutePipelineRunner(
  handler: RouteHandler,
  middleware: Middleware[],
): RoutePipelineRunner {
  return new RoutePipelineRunner(middleware, handler);
}