import { PondoknusaRequest } from './request.js';
import type { RouteParams } from './types.js';

const DEFAULT_POOL_SIZE = 128;

export class PondoknusaRequestPool {
  private readonly maxSize: number;
  private readonly pool: PondoknusaRequest[] = [];

  constructor(maxSize = DEFAULT_POOL_SIZE) {
    this.maxSize = Math.max(1, maxSize);
  }

  acquire(raw: Request, params: RouteParams, routeName?: string): PondoknusaRequest {
    const request = this.pool.pop();
    if (request) {
      request.reinitialize(raw, params, routeName);
      return request;
    }

    return new PondoknusaRequest(raw, params, routeName);
  }

  release(request: PondoknusaRequest): void {
    request.resetMutableState();
    if (this.pool.length < this.maxSize) {
      this.pool.push(request);
    }
  }

  get size(): number {
    return this.pool.length;
  }
}