import {
  coalesceHydrationManifest,
  Response,
  type PartialReloadOptions,
  type SsrStreamOptions,
} from '@pondoknusa/http';
import type { PondoknusaRequest } from '@pondoknusa/http';
import type {
  ComponentCatalogEntry,
  IslandCatalogEntry,
  ViewCatalog,
  CustomDirectiveHandler,
  EscapeHandler,
  ViewAuthBindings,
  ViewComponentBinding,
  ViewComposerHandler,
  ViewContext,
  ViewExpressionBindings,
  ViewPropsFor,
} from '@pondoknusa/views';
import { ViewEngine } from '@pondoknusa/views';
import type { Application } from './application.js';

let activeApp: Application | undefined;
let activeViewRequest: PondoknusaRequest | undefined;

export function setViewApplication(app: Application): void {
  activeApp = app;
}

export function setViewRequest(request: PondoknusaRequest | undefined): void {
  activeViewRequest = request;
}

export function getViewRequest(): PondoknusaRequest | undefined {
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

export interface PartialViewOptions extends PartialReloadOptions {
  /** Render only the named `@fragment` block from the view. */
  fragment?: string;
}

export interface ViewFacade {
  render<TName extends string>(
    name: TName,
    context?: ViewPropsFor<TName>,
  ): Promise<string>;
  renderFragment<TName extends string>(
    name: TName,
    fragmentName: string,
    context?: ViewPropsFor<TName>,
  ): Promise<string>;
  partial<TName extends string>(
    name: TName,
    context?: ViewPropsFor<TName>,
    options?: PartialViewOptions,
  ): Promise<Response>;
  renderStream<TName extends string>(
    name: TName,
    context?: ViewPropsFor<TName>,
    handlers?: Record<string, (ctx: ViewContext) => Promise<string>>,
  ): AsyncGenerator<string>;
  streamSsr<TName extends string>(
    name: TName,
    context?: ViewPropsFor<TName>,
    handlers?: Record<string, (ctx: ViewContext) => Promise<string>>,
    options?: SsrStreamOptions,
  ): Response;
  exists(name: string): Promise<boolean>;
  catalog(): Promise<ViewCatalog>;
  islandCatalog(): Promise<IslandCatalogEntry[]>;
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
  renderFragment: <TName extends string>(
    name: TName,
    fragmentName: string,
    context?: ViewPropsFor<TName>,
  ) => viewEngine().renderFragment(name, fragmentName, (context ?? {}) as ViewPropsFor<TName>),
  partial: async <TName extends string>(
    name: TName,
    context?: ViewPropsFor<TName>,
    options: PartialViewOptions = {},
  ) => {
    const { fragment, ...reloadOptions } = options;
    const html = fragment
      ? await viewEngine().renderFragment(
          name,
          fragment,
          (context ?? {}) as ViewPropsFor<TName>,
        )
      : await viewEngine().render(name, (context ?? {}) as ViewPropsFor<TName>);
    return Response.partial(html, reloadOptions);
  },
  renderStream: <TName extends string>(
    name: TName,
    context?: ViewPropsFor<TName>,
    handlers?: Record<string, (ctx: ViewContext) => Promise<string>>,
  ) => viewEngine().renderStream(name, (context ?? {}) as ViewPropsFor<TName>, handlers),
  streamSsr: <TName extends string>(
    name: TName,
    context?: ViewPropsFor<TName>,
    handlers?: Record<string, (ctx: ViewContext) => Promise<string>>,
    options?: SsrStreamOptions,
  ) => {
    const engine = viewEngine();
    return Response.ssrStream(
      engine.renderStream(name, (context ?? {}) as ViewPropsFor<TName>, handlers ?? {}),
      {
        ...options,
        hydrationManifest:
          options?.hydrationManifest
          ?? (() => coalesceHydrationManifest(engine.getHydrationManifest())),
      },
    );
  },
  exists: (name) => viewEngine().exists(name),
  catalog: () => viewEngine().getViewCatalog(),
  islandCatalog: () => viewEngine().getIslandCatalog(),
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