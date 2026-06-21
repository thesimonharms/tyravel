import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  cacheFileForView,
  clearCompiledCacheDir,
  discoverViewNames,
  readCompiledCache,
  writeCompiledCache,
} from './compiled-cache.js';
import { compile, type CompileOptions } from './compiler.js';
import { mergeEvaluationContext } from './evaluate.js';
import {
  flattenTranslations,
  loadLocaleFile,
  resolveLocalePath,
  translate,
} from './locale.js';
import { renderOps } from './renderer.js';
import type { CompiledTemplate, ViewConfig, ViewContext } from './types.js';
import { parseViewName } from './view-namespaces.js';
import {
  ViewRegistry,
  type CustomDirectiveHandler,
  type ViewAuthBindings,
  type ViewComponentBinding,
  type ViewComposerHandler,
  type ViewExpressionBindings,
  type ViewFormBindings,
  type ViewLocaleBindings,
} from './view-registry.js';
import { ViewHelpers } from './view-helpers.js';
import { readViteManifest, renderViteTags, type ViteManifest } from './vite-helpers.js';

interface CacheEntry {
  mtimeMs: number;
  registryVersion: number;
  template: CompiledTemplate;
}

const DEFAULT_COMPILED_PATH = 'storage/framework/views';
const DEFAULT_LOCALES_PATH = 'resources/lang';
const DEFAULT_MANIFEST_PATH = 'public/build/manifest.json';
const DEFAULT_VITE_BASE = '/build';

export class ViewEngine {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly extension: string;
  private readonly registry = new ViewRegistry();
  private readonly viewsRoot: string;
  private readonly namespaces = new Map<string, string>();
  private readonly localesPath: string;
  private readonly manifestPath: string;
  private readonly viteBase: string;
  private localeCode: string;
  private translations: Record<string, string> = {};
  private viteManifest?: ViteManifest;
  private compiledCacheDirectory?: string;

  constructor(
    private readonly basePath: string,
    private readonly config: ViewConfig,
  ) {
    this.extension = config.extension ?? '.tyr';
    this.viewsRoot = join(this.basePath, this.config.path);

    if (config.compiled) {
      this.compiledCacheDirectory = join(
        this.basePath,
        config.compiledPath ?? DEFAULT_COMPILED_PATH,
      );
    }

    this.localesPath = config.localesPath ?? DEFAULT_LOCALES_PATH;
    this.manifestPath = join(this.basePath, config.manifestPath ?? DEFAULT_MANIFEST_PATH);
    this.viteBase = config.viteBase ?? DEFAULT_VITE_BASE;
    this.localeCode = config.locale ?? 'en';

    if (config.namespaces) {
      for (const [name, path] of Object.entries(config.namespaces)) {
        this.namespaces.set(name, this.resolveNamespacePath(path));
      }
    }

    if (config.env) {
      this.registry.setEnvironment(config.env);
    }

    this.reloadLocale();
    this.syncTranslatorBinding();
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

  setForm(form: ViewFormBindings | undefined): this {
    this.registry.setForm(form);
    return this;
  }

  component(name: string, binding: ViewComponentBinding): this {
    this.registry.component(name, binding);
    return this;
  }

  namespace(name: string, path: string): this {
    this.namespaces.set(name, this.resolveNamespacePath(path));
    return this;
  }

  setLocale(locale: string): this {
    this.localeCode = locale;
    this.reloadLocale();
    this.syncTranslatorBinding();
    return this;
  }

  setEnvironment(environment: string): this {
    this.registry.setEnvironment(environment);
    return this;
  }

  getCompiledTemplate(name: string): CompiledTemplate {
    return this.loadTemplate(this.resolveName(name));
  }

  setCompiledCachePath(path: string | null): this {
    this.compiledCacheDirectory = path ?? undefined;
    return this;
  }

  getRegistry(): ViewRegistry {
    return this.registry;
  }

  buildEvaluationContext(context: ViewContext): ViewContext {
    return mergeEvaluationContext(context, this.registry.getBindings());
  }

  resolveName(name: string): string {
    const parsed = parseViewName(name);

    if (parsed.namespace) {
      if (this.existsAt(name)) {
        return name;
      }
      return name;
    }

    if (this.existsAt(name)) {
      return name;
    }

    const anonymous = `components.${name}`;
    if (this.existsAt(anonymous)) {
      return anonymous;
    }

    return name;
  }

  async render(
    name: string,
    context: ViewContext = {},
    parentSections?: ReadonlyMap<string, string>,
    parentStacks?: Map<string, string[]>,
    parentOnceRendered?: Set<string>,
    parentComponentPropsStack?: Record<string, unknown>[],
  ): Promise<string> {
    const resolved = this.resolveName(name);
    const template = this.loadTemplate(resolved);
    const composed = await this.registry.applyComposers(resolved, context);
    const renderContext = this.buildEvaluationContext(this.mergeFormContext(composed));
    const helpers = new ViewHelpers(
      parentStacks,
      parentOnceRendered,
      parentComponentPropsStack,
    );

    if (parentSections) {
      helpers.importSections(parentSections);
    }

    await renderOps(template.ops, renderContext, helpers, this);

    if (template.layout) {
      const layoutHelpers = new ViewHelpers(
        helpers.getStacks(),
        helpers.getOnceRendered(),
        helpers.getComponentPropsStack(),
      );
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
    if (this.existsAt(name)) {
      return true;
    }

    const parsed = parseViewName(name);
    if (!parsed.namespace) {
      return this.existsAt(`components.${name}`);
    }

    return false;
  }

  renderVite(entry: string): string {
    if (!this.viteManifest) {
      this.viteManifest = readViteManifest(this.manifestPath);
    }
    return renderViteTags(this.viteManifest, entry, this.viteBase);
  }

  translate(
    key: string,
    replacements: Record<string, string | number> = {},
  ): string {
    return translate(key, this.translations, replacements);
  }

  async warmCompiledCache(): Promise<number> {
    if (!this.compiledCacheDirectory) {
      throw new Error('Compiled view cache is disabled for this engine.');
    }

    let warmed = 0;
    for (const name of this.listViewNames()) {
      this.loadTemplate(name);
      warmed += 1;
    }
    return warmed;
  }

  clearCompiledCache(): number {
    if (!this.compiledCacheDirectory) {
      return 0;
    }

    this.cache.clear();
    return clearCompiledCacheDir(this.compiledCacheDirectory);
  }

  listViewNames(): string[] {
    const names = discoverViewNames(this.viewsRoot, this.extension);
    for (const [namespace, root] of this.namespaces.entries()) {
      for (const view of discoverViewNames(root, this.extension)) {
        names.push(`${namespace}::${view}`);
      }
    }
    return names;
  }

  private existsAt(name: string): boolean {
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

    const compileOptions: CompileOptions = {
      customDirectives: this.registry.getDirectiveNames(),
    };

    if (this.compiledCacheDirectory) {
      const cacheFile = cacheFileForView(this.compiledCacheDirectory, this.viewsRoot, path);
      const diskEntry = readCompiledCache(cacheFile);
      if (
        diskEntry &&
        diskEntry.mtimeMs === stats.mtimeMs &&
        diskEntry.registryVersion === registryVersion
      ) {
        this.cache.set(path, {
          mtimeMs: stats.mtimeMs,
          registryVersion,
          template: diskEntry.template,
        });
        return diskEntry.template;
      }

      const source = readFileSync(path, 'utf8');
      const template = compile(source, compileOptions);
      const memoryEntry = { mtimeMs: stats.mtimeMs, registryVersion, template };
      this.cache.set(path, memoryEntry);
      writeCompiledCache(cacheFile, memoryEntry);
      return template;
    }

    const source = readFileSync(path, 'utf8');
    const template = compile(source, compileOptions);
    this.cache.set(path, { mtimeMs: stats.mtimeMs, registryVersion, template });
    return template;
  }

  private mergeFormContext(context: ViewContext): ViewContext {
    const form = this.registry.getForm();
    if (!form) {
      return context;
    }

    return {
      ...context,
      $errors: form.errors(),
    };
  }

  private resolvePath(name: string): string {
    const parsed = parseViewName(name);
    const relative = parsed.view.replace(/\./g, '/');
    const root = this.resolveNamespaceRoot(parsed.namespace);
    return join(root, `${relative}${this.extension}`);
  }

  private resolveNamespaceRoot(namespace?: string): string {
    if (!namespace) {
      return this.viewsRoot;
    }

    const configured = this.namespaces.get(namespace);
    if (configured) {
      return configured;
    }

    return join(this.viewsRoot, 'vendor', namespace);
  }

  private resolveNamespacePath(path: string): string {
    return path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path)
      ? path
      : join(this.basePath, path);
  }

  private reloadLocale(): void {
    const localePath = resolveLocalePath(this.basePath, this.localesPath, this.localeCode);
    if (!existsSync(localePath)) {
      this.translations = {};
      this.registry.setLocale(undefined);
      return;
    }

    const tree = loadLocaleFile(localePath);
    this.translations = flattenTranslations(tree);
    const localeBindings: ViewLocaleBindings = {
      translate: (key, replacements = {}) => this.translate(key, replacements),
    };
    this.registry.setLocale(localeBindings);
  }

  private syncTranslatorBinding(): void {
    this.registry.setBindings({
      ...this.registry.getBindings(),
      __: (key, replacements = {}) =>
        this.translate(
          String(key),
          replacements as Record<string, string | number>,
        ),
    });
  }
}