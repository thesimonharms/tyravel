import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { compile, type CompileOptions } from './compiler.js';
import { mergeEvaluationContext } from './evaluate.js';
import { renderOps } from './renderer.js';
import type { CompiledTemplate, ViewConfig, ViewContext } from './types.js';
import {
  ViewRegistry,
  type CustomDirectiveHandler,
  type ViewAuthBindings,
  type ViewComposerHandler,
  type ViewExpressionBindings,
} from './view-registry.js';
import { ViewHelpers } from './view-helpers.js';

interface CacheEntry {
  mtimeMs: number;
  registryVersion: number;
  template: CompiledTemplate;
}

export class ViewEngine {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly extension: string;
  private readonly registry = new ViewRegistry();

  constructor(
    private readonly basePath: string,
    private readonly config: ViewConfig,
  ) {
    this.extension = config.extension ?? '.tyr';
  }

  directive(name: string, handler: CustomDirectiveHandler): this {
    this.registry.directive(name, handler);
    this.cache.clear();
    return this;
  }

  composer(pattern: string, handler: ViewComposerHandler): this {
    this.registry.composer(pattern, handler);
    return this;
  }

  share(data: ViewContext): this {
    this.registry.share(data);
    return this;
  }

  setBindings(bindings: ViewExpressionBindings): this {
    this.registry.setBindings(bindings);
    return this;
  }

  setAuth(auth: ViewAuthBindings | undefined): this {
    this.registry.setAuth(auth);
    return this;
  }

  getRegistry(): ViewRegistry {
    return this.registry;
  }

  buildEvaluationContext(context: ViewContext): ViewContext {
    return mergeEvaluationContext(context, this.registry.getBindings());
  }

  async render(
    name: string,
    context: ViewContext = {},
    parentSections?: ReadonlyMap<string, string>,
    parentStacks?: Map<string, string[]>,
  ): Promise<string> {
    const template = this.loadTemplate(name);
    const renderContext = this.buildEvaluationContext(
      await this.registry.applyComposers(name, context),
    );
    const helpers = new ViewHelpers(parentStacks);

    if (parentSections) {
      helpers.importSections(parentSections);
    }

    await renderOps(template.ops, renderContext, helpers, this);

    if (template.layout) {
      const layoutHelpers = new ViewHelpers(helpers.getStacks());
      layoutHelpers.importSections(helpers.getSections());
      await renderOps(
        this.loadTemplate(template.layout).ops,
        renderContext,
        layoutHelpers,
        this,
      );
      return layoutHelpers.toString();
    }

    return helpers.toString();
  }

  exists(name: string): boolean {
    try {
      statSync(this.resolvePath(name));
      return true;
    } catch {
      return false;
    }
  }

  private loadTemplate(name: string): CompiledTemplate {
    const path = this.resolvePath(name);
    const stats = statSync(path);
    const registryVersion = this.registry.getCompileVersion();
    const cached = this.cache.get(path);

    if (
      cached &&
      cached.mtimeMs === stats.mtimeMs &&
      cached.registryVersion === registryVersion
    ) {
      return cached.template;
    }

    const source = readFileSync(path, 'utf8');
    const compileOptions: CompileOptions = {
      customDirectives: this.registry.getDirectiveNames(),
    };
    const template = compile(source, compileOptions);
    this.cache.set(path, { mtimeMs: stats.mtimeMs, registryVersion, template });
    return template;
  }

  private resolvePath(name: string): string {
    const relative = name.replace(/\./g, '/');
    return join(this.basePath, this.config.path, `${relative}${this.extension}`);
  }
}