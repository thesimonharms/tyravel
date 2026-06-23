import type { TyravelRequest } from '@tyravel/http';
import type {
  ComponentCatalogEntry,
  CustomDirectiveHandler,
  EscapeHandler,
  ViewAuthBindings,
  ViewComponentBinding,
  ViewComposerHandler,
  ViewContext,
  ViewExpressionBindings,
  ViewPropsFor,
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
  render<TName extends string>(
    name: TName,
    context?: ViewPropsFor<TName>,
  ): Promise<string>;
  renderStream<TName extends string>(
    name: TName,
    context?: ViewPropsFor<TName>,
    handlers?: Record<string, (ctx: ViewContext) => Promise<string>>,
  ): AsyncGenerator<string>;
  exists(name: string): Promise<boolean>;
  catalog(): ComponentCatalogEntry[];
  escape(context: string, handler: EscapeHandler): ViewFacade;
  getHydrationManifest(): { islands: Array<{ id: string; html: string; props: Record<string, unknown> }> };
  directive(name: string, handler: CustomDirectiveHandler): ViewFacade;
  composer(pattern: string, handler: ViewComposerHandler): ViewFacade;
  share(data: ViewContext): ViewFacade;
  setBindings(bindings: ViewExpressionBindings): ViewFacade;
  setAuth(auth: ViewAuthBindings | undefined): ViewFacade;
  component(name: string, binding: ViewComponentBinding): ViewFacade;
  namespace(name: string, path: string): ViewFacade;
  setLocale(locale: string): ViewFacade;
  setEnvironment(environment: string): ViewFacade;
}

export const View: ViewFacade = {
  render: <TName extends string>(name: TName, context?: ViewPropsFor<TName>) =>
    viewEngine().render(name, (context ?? {}) as ViewPropsFor<TName>),
  renderStream: <TName extends string>(
    name: TName,
    context?: ViewPropsFor<TName>,
    handlers?: Record<string, (ctx: ViewContext) => Promise<string>>,
  ) => viewEngine().renderStream(name, (context ?? {}) as ViewPropsFor<TName>, handlers),
  exists: (name) => viewEngine().exists(name),
  catalog: () => viewEngine().getComponentCatalog(),
  escape: (context, handler) => {
    viewEngine().escape(context, handler);
    return View;
  },
  getHydrationManifest: () => viewEngine().getHydrationManifest(),
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
  component: (name, binding) => {
    viewEngine().component(name, binding);
    return View;
  },
  namespace: (name, path) => {
    viewEngine().namespace(name, path);
    return View;
  },
  setLocale: (locale) => {
    viewEngine().setLocale(locale);
    return View;
  },
  setEnvironment: (environment) => {
    viewEngine().setEnvironment(environment);
    return View;
  },
};