import type { Middleware } from './types.js';

export class MiddlewareNotFoundException extends Error {
  constructor(name: string) {
    super(`Middleware not found: ${name}`);
    this.name = 'MiddlewareNotFoundException';
  }
}

export type MiddlewareInput = Middleware | string | MiddlewareInput[];

export class MiddlewareRegistry {
  private aliases = new Map<string, Middleware>();
  private readonly resolvedAliases = new Map<string, Middleware>();

  alias(name: string, middleware: Middleware): this {
    this.aliases.set(name, middleware);
    this.resolvedAliases.delete(name);
    return this;
  }

  has(name: string): boolean {
    return this.aliases.has(name);
  }

  resolve(input: MiddlewareInput): Middleware {
    if (Array.isArray(input)) {
      throw new Error(
        'Nested middleware arrays must be flattened before resolve(). Use flattenMiddlewareInputs().',
      );
    }

    if (typeof input !== 'string') {
      return input;
    }

    const cached = this.resolvedAliases.get(input);
    if (cached) {
      return cached;
    }

    const middleware = this.aliases.get(input);
    if (!middleware) {
      throw new MiddlewareNotFoundException(input);
    }

    this.resolvedAliases.set(input, middleware);
    return middleware;
  }

  resolveMany(inputs: MiddlewareInput[]): Middleware[] {
    return inputs.map((input) => this.resolve(input));
  }
}