import { TyravelRequest } from './request.js';
import type { RouteParams } from './types.js';

const DEFAULT_POOL_SIZE = 128;

export class TyravelRequestPool {
  private readonly maxSize: number;
  private readonly pool: TyravelRequest[] = [];

  constructor(maxSize = DEFAULT_POOL_SIZE) {
    this.maxSize = Math.max(1, maxSize);
  }

  acquire(raw: Request, params: RouteParams, routeName?: string): TyravelRequest {
    const request = this.pool.pop();
    if (request) {
      request.reinitialize(raw, params, routeName);
      return request;
    }

    return new TyravelRequest(raw, params, routeName);
  }

  release(request: TyravelRequest): void {
    request.resetMutableState();
    if (this.pool.length < this.maxSize) {
      this.pool.push(request);
    }
  }

  get size(): number {
    return this.pool.length;
  }
}