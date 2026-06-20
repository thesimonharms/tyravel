import type { Authenticatable } from '@tyravel/auth';
import { AuthorizationException } from '@tyravel/auth';
import type { Constructor } from '@tyravel/container';
import type { TyravelRequest } from '@tyravel/http';
import {
  validateRequest,
  type ValidationRules,
} from '@tyravel/validation';
import type { Application } from './application.js';
import { Gate } from './gate.js';

export abstract class FormRequest<T extends Record<string, unknown> = Record<string, unknown>> {
  protected request!: TyravelRequest;
  private validatedData?: T;

  abstract rules(): ValidationRules<T>;

  authorize(): boolean | Promise<boolean> {
    return true;
  }

  async prepare(request: TyravelRequest, _app: Application): Promise<this> {
    this.request = request;

    const authorized = await this.authorize();
    if (!authorized) {
      throw new AuthorizationException();
    }

    this.validatedData = await validateRequest(request, this.rules());
    return this;
  }

  validated(): T {
    if (!this.validatedData) {
      throw new Error('Form request has not been validated.');
    }
    return this.validatedData;
  }

  all(): T {
    return this.validated();
  }

  input<K extends keyof T>(key: K, fallback?: T[K]): T[K] | undefined {
    const value = this.validated()[key];
    return value === undefined ? fallback : value;
  }

  only<K extends keyof T>(...keys: K[]): Pick<T, K> {
    const data = this.validated();
    const result = {} as Pick<T, K>;
    for (const key of keys) {
      if (key in data) {
        result[key] = data[key];
      }
    }
    return result;
  }

  except<K extends keyof T>(...keys: K[]): Omit<T, K> {
    const data = { ...this.validated() };
    for (const key of keys) {
      delete data[key];
    }
    return data;
  }

  user(): Authenticatable | null {
    return (this.request.user as Authenticatable | null) ?? null;
  }

  param(name: string, fallback?: string): string | undefined {
    return this.request.param(name, fallback);
  }

  query(name: string, fallback?: string): string | undefined {
    return this.request.query(name, fallback);
  }

  protected async authorizePolicy(
    ability: string,
    model?: unknown,
  ): Promise<boolean> {
    const user = this.user();
    try {
      await Gate.authorize(user, ability, model);
      return true;
    } catch {
      return false;
    }
  }
}

export type FormRequestConstructor<
  T extends Record<string, unknown> = Record<string, unknown>,
> = Constructor<FormRequest<T>>;

export function isFormRequestConstructor(
  value: unknown,
): value is FormRequestConstructor {
  if (typeof value !== 'function') {
    return false;
  }

  const prototype = (value as { prototype?: object }).prototype;
  if (!prototype) {
    return false;
  }

  return prototype instanceof FormRequest || FormRequest.prototype.isPrototypeOf(prototype);
}