import type { Constructor } from '@tyravel/container';
import type { RouteHandler, TyravelRequest } from '@tyravel/http';
import { resolveHttpResult } from '@tyravel/http';
import type { Application } from './application.js';
import {
  FormRequest,
  isFormRequestConstructor,
  type FormRequestConstructor,
} from './form-request.js';

export type ControllerConstructor = Constructor<object>;
export type ControllerAction =
  | [ControllerConstructor, string]
  | [ControllerConstructor, string, FormRequestConstructor];

export function isControllerAction(handler: unknown): handler is ControllerAction {
  if (!Array.isArray(handler) || handler.length < 2 || handler.length > 3) {
    return false;
  }

  if (typeof handler[0] !== 'function' || typeof handler[1] !== 'string') {
    return false;
  }

  if (handler.length === 3 && !isFormRequestConstructor(handler[2])) {
    return false;
  }

  return true;
}

export function createControllerHandler(
  app: Application,
  action: ControllerAction,
): RouteHandler {
  const [Controller, method, FormRequestClass] = action;

  return async (request: TyravelRequest) => {
    const controller = app.make(Controller);
    const handler = (controller as Record<string, unknown>)[method];

    if (typeof handler !== 'function') {
      throw new Error(`Controller action not found: ${Controller.name}@${method}`);
    }

    let formRequest: FormRequest | undefined;
    if (FormRequestClass) {
      const instance = app.make(FormRequestClass);
      formRequest = await instance.prepare(request, app);
    }

    const result =
      formRequest && handler.length < 2
        ? await (handler as (form: FormRequest) => unknown).call(controller, formRequest)
        : await (handler as (request: TyravelRequest, form?: FormRequest) => unknown).call(
            controller,
            request,
            formRequest,
          );

    return resolveHttpResult(result, request);
  };
}