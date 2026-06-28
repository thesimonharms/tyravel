import type { ComponentMemoCacheStore } from './component-memo-cache.js';
import { InMemoryComponentMemoCache } from './component-memo-cache.js';
import type { FragmentCacheStore } from './fragment-cache.js';
import { InMemoryFragmentCache } from './fragment-cache.js';
import {
  BUILTIN_ESCAPE_CONTEXTS,
  type EscapeHandler,
} from './escape.js';
import { HydrationManifest } from './hydration.js';
import type { ViewErrorBag } from './view-errors.js';
import type { ViewContext } from './types.js';

export type ViewInjector = (
  binding: string,
) => unknown | Promise<unknown>;

export interface ViewFormBindings {
  csrfToken(): string;
  errors(): ViewErrorBag;
}

export type ViewComposerHandler = (
  viewName: string,
  context: ViewContext,
) => ViewContext | Promise<ViewContext>;

export type CustomDirectiveHandler = (
  expression: string,
  context: ViewContext,
) => string | Promise<string>;

export interface ViewExpressionBindings {
  route?: (name: string, params?: Record<string, string | number>) => string;
  asset?: (path: string) => string;
  config?: (key: string, defaultValue?: unknown) => unknown;
  old?: (key: string, defaultValue?: unknown) => unknown;
  [key: string]: unknown;
}

export interface ViewAuthBindings {
  check(): boolean | Promise<boolean>;
  user(): unknown;
  can(ability: string, model?: unknown): boolean | Promise<boolean>;
}

export interface ViewComponentBinding {
  data(
    context: ViewContext,
  ): Record<string, unknown> | Promise<Record<string, unknown>>;
}

export interface ViewLocaleBindings {
  translate(key: string, replacements?: Record<string, string | number>): string;
}

interface ComposerEntry {
  pattern: RegExp;
  handler: ViewComposerHandler;
}

export class ViewRegistry {
  private readonly composers: ComposerEntry[] = [];
  private readonly directives = new Map<string, CustomDirectiveHandler>();
  private directiveNamesCache: ReadonlySet<string> | null = null;
  private readonly components = new Map<string, ViewComponentBinding>();
  private shared: ViewContext = {};
  private bindings: ViewExpressionBindings = {};
  private auth?: ViewAuthBindings;
  private form?: ViewFormBindings;
  private locale?: ViewLocaleBindings;
  private environment = 'production';
  private compileVersion = 0;
  private injector?: ViewInjector;
  private fragmentCache: FragmentCacheStore = new InMemoryFragmentCache();
  private componentMemoCache: ComponentMemoCacheStore = new InMemoryComponentMemoCache();
  private readonly escapeContexts = new Map<string, EscapeHandler>(
    Object.entries(BUILTIN_ESCAPE_CONTEXTS),
  );
  private hydrationManifest = new HydrationManifest();

  directive(name: string, handler: CustomDirectiveHandler): this {
    this.directives.set(name, handler);
    this.directiveNamesCache = null;
    this.compileVersion += 1;
    return this;
  }

  composer(pattern: string, handler: ViewComposerHandler): this {
    this.composers.push({
      pattern: viewPatternToRegex(pattern),
      handler,
    });
    return this;
  }

  share(data: ViewContext): this {
    this.shared = { ...this.shared, ...data };
    return this;
  }

  setBindings(bindings: ViewExpressionBindings): this {
    this.bindings = { ...this.bindings, ...bindings };
    return this;
  }

  setAuth(auth: ViewAuthBindings | undefined): this {
    this.auth = auth;
    return this;
  }

  setForm(form: ViewFormBindings | undefined): this {
    this.form = form;
    return this;
  }

  setLocale(locale: ViewLocaleBindings | undefined): this {
    this.locale = locale;
    return this;
  }

  setEnvironment(environment: string): this {
    this.environment = environment;
    return this;
  }

  setInjector(injector: ViewInjector | undefined): this {
    this.injector = injector;
    return this;
  }

  getInjector(): ViewInjector | undefined {
    return this.injector;
  }

  setFragmentCache(store: FragmentCacheStore): this {
    this.fragmentCache = store;
    return this;
  }

  getFragmentCache(): FragmentCacheStore {
    return this.fragmentCache;
  }

  setComponentMemoCache(store: ComponentMemoCacheStore): this {
    this.componentMemoCache = store;
    return this;
  }

  getComponentMemoCache(): ComponentMemoCacheStore {
    return this.componentMemoCache;
  }

  escape(context: string, handler: EscapeHandler): this {
    this.escapeContexts.set(context, handler);
    return this;
  }

  getEscapeHandler(context: string): EscapeHandler | undefined {
    return this.escapeContexts.get(context);
  }

  getEscapeContexts(): ReadonlyMap<string, EscapeHandler> {
    return this.escapeContexts;
  }

  resetHydrationManifest(): HydrationManifest {
    this.hydrationManifest.clear();
    return this.hydrationManifest;
  }

  getHydrationManifest(): HydrationManifest {
    return this.hydrationManifest;
  }

  getLocale(): ViewLocaleBindings | undefined {
    return this.locale;
  }

  getEnvironment(): string {
    return this.environment;
  }

  component(name: string, binding: ViewComponentBinding): this {
    this.components.set(name, binding);
    const anonymous = name.startsWith('components.') ? name.slice('components.'.length) : name;
    if (anonymous !== name) {
      this.components.set(anonymous, binding);
    } else {
      this.components.set(`components.${name}`, binding);
    }
    return this;
  }

  getComponent(name: string): ViewComponentBinding | undefined {
    return this.components.get(name);
  }

  getForm(): ViewFormBindings | undefined {
    return this.form;
  }

  getShared(): ViewContext {
    return this.shared;
  }

  getBindings(): ViewExpressionBindings {
    return this.bindings;
  }

  getAuth(): ViewAuthBindings | undefined {
    return this.auth;
  }

  getDirective(name: string): CustomDirectiveHandler | undefined {
    return this.directives.get(name);
  }

  getDirectiveNames(): ReadonlySet<string> {
    if (!this.directiveNamesCache) {
      this.directiveNamesCache = new Set(this.directives.keys());
    }
    return this.directiveNamesCache;
  }

  getCompileVersion(): number {
    return this.compileVersion;
  }

  async applyComposers(viewName: string, context: ViewContext): Promise<ViewContext> {
    if (this.composers.length === 0) {
      return Object.keys(this.shared).length === 0
        ? context
        : { ...this.shared, ...context };
    }

    let merged = { ...this.shared, ...context };

    for (const { pattern, handler } of this.composers) {
      if (!pattern.test(viewName)) {
        continue;
      }

      const data = await handler(viewName, merged);
      merged = { ...merged, ...data };
    }

    return merged;
  }
}

function viewPatternToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}