import type { ViewErrorBag } from './view-errors.js';
import type { ViewContext } from './types.js';

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
  private readonly components = new Map<string, ViewComponentBinding>();
  private shared: ViewContext = {};
  private bindings: ViewExpressionBindings = {};
  private auth?: ViewAuthBindings;
  private form?: ViewFormBindings;
  private locale?: ViewLocaleBindings;
  private environment = 'production';
  private compileVersion = 0;

  directive(name: string, handler: CustomDirectiveHandler): this {
    this.directives.set(name, handler);
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
    return new Set(this.directives.keys());
  }

  getCompileVersion(): number {
    return this.compileVersion;
  }

  async applyComposers(viewName: string, context: ViewContext): Promise<ViewContext> {
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