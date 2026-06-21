import type { TyravelRequest } from '@tyravel/http';
import type {
  CustomDirectiveHandler,
  ViewAuthBindings,
  ViewComposerHandler,
  ViewContext,
  ViewExpressionBindings,
} from '@tyravel/views';
import { ViewEngine } from '@tyravel/views';
import type { Application } from './application.js';

let activeApp: Application | undefined;
let activeViewRequest: TyravelRequest | undefined;

export function setViewApplication(app: Application): void {
  activeApp = app;
}

export function setViewRequest(request: TyravelRequest | undefined): void {
  activeViewRequest = request;
}

export function getViewRequest(): TyravelRequest | undefined {
  return activeViewRequest;
}

function viewEngine(): ViewEngine {
  if (!activeApp) {
    throw new Error(
      'View facade is not ready. Boot the application and register ViewServiceProvider first.',
    );
  }
  return activeApp.make<ViewEngine>('view');
}

export interface ViewFacade {
  render(name: string, context?: ViewContext): Promise<string>;
  exists(name: string): boolean;
  directive(name: string, handler: CustomDirectiveHandler): ViewFacade;
  composer(pattern: string, handler: ViewComposerHandler): ViewFacade;
  share(data: ViewContext): ViewFacade;
  setBindings(bindings: ViewExpressionBindings): ViewFacade;
  setAuth(auth: ViewAuthBindings | undefined): ViewFacade;
}

export const View: ViewFacade = {
  render: (name, context) => viewEngine().render(name, context),
  exists: (name) => viewEngine().exists(name),
  directive: (name, handler) => {
    viewEngine().directive(name, handler);
    return View;
  },
  composer: (pattern, handler) => {
    viewEngine().composer(pattern, handler);
    return View;
  },
  share: (data) => {
    viewEngine().share(data);
    return View;
  },
  setBindings: (bindings) => {
    viewEngine().setBindings(bindings);
    return View;
  },
  setAuth: (auth) => {
    viewEngine().setAuth(auth);
    return View;
  },
};