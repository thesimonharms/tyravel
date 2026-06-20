import type { Container } from '@tyravel/container';
import type { Constructor } from '@tyravel/container';
import type { Authenticatable } from './types.js';
import type { PolicyConstructor } from './types.js';
import { Policy } from './policy.js';
import { AuthorizationException } from './authorization-exceptions.js';

export class Gate {
  private readonly policyMap = new Map<string, PolicyConstructor>();

  constructor(
    private readonly container: Container,
    policies: Record<string, PolicyConstructor> = {},
  ) {
    for (const [modelName, policy] of Object.entries(policies)) {
      this.policyMap.set(modelName, policy);
    }
  }

  policy(model: Constructor<unknown>, policy: PolicyConstructor): this {
    this.policyMap.set(model.name, policy);
    return this;
  }

  async allows(
    user: Authenticatable | null,
    ability: string,
    model?: unknown,
  ): Promise<boolean> {
    if (!user) {
      return false;
    }

    const policy = this.resolvePolicy(model);
    if (!policy) {
      return false;
    }

    const handler = (policy as Record<string, unknown>)[ability];
    if (typeof handler !== 'function') {
      return false;
    }

    const result = await handler.call(policy, user, model);
    return Boolean(result);
  }

  async authorize(
    user: Authenticatable | null,
    ability: string,
    model?: unknown,
  ): Promise<void> {
    const allowed = await this.allows(user, ability, model);
    if (!allowed) {
      throw new AuthorizationException();
    }
  }

  async denyUnless(
    user: Authenticatable | null,
    ability: string,
    model?: unknown,
  ): Promise<void> {
    await this.authorize(user, ability, model);
  }

  private resolvePolicy(model?: unknown): Policy | null {
    if (!model) {
      return null;
    }

    const modelName =
      typeof model === 'object' && model !== null && 'constructor' in model
        ? (model.constructor as { name: string }).name
        : typeof model === 'function'
          ? (model as { name: string }).name
          : undefined;

    if (!modelName) {
      return null;
    }

    const PolicyClass = this.policyMap.get(modelName);
    if (!PolicyClass) {
      return null;
    }

    return this.container.make(PolicyClass);
  }
}

export function createAuthorizeMiddleware(
  gate: Gate,
  ability: string,
  resolveModel?: (request: import('@tyravel/http').TyravelRequest) => Promise<unknown> | unknown,
): import('@tyravel/http').Middleware {
  return async (request, next) => {
    const user = request.user as Authenticatable | null;
    const model = resolveModel ? await resolveModel(request) : undefined;
    await gate.authorize(user, ability, model);
    return next();
  };
}