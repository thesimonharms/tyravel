import { existsSync } from 'node:fs';
import { access, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import {
  cacheFileForView,
  clearCompiledCacheDir,
  discoverViewNames,
  readCompiledCache,
  writeCompiledCache,
} from './compiled-cache.js';
import { compile, type CompileOptions } from './compiler.js';
import { validateViewProps } from './component-props.js';
import { shouldRequireCompiledCache } from './compiled-cache-policy.js';
import { findFragmentBody, ViewFragmentNotFoundError } from './fragment-ops.js';
import { CompiledViewCacheMissError } from './view-cache-error.js';
import { ViewCompileError } from './view-compile-error.js';
import { mergeEvaluationContext } from './evaluate.js';
import {
  flattenTranslations,
  loadLocaleFile,
  resolveLocalePath,
  translate,
} from './locale.js';
import {
  buildComponentCatalog,
  type ComponentCatalogEntry,
} from './component-catalog.js';
import { buildViewCatalog, type IslandCatalogEntry, type ViewCatalog } from './island-catalog.js';
import { loadProgrammaticView } from './programmatic-view.js';
import { renderOps } from './renderer.js';
import { streamPlaceholder } from './streaming.js';
import type {
  CompiledTemplate,
  RenderOptions,
  TemplateOp,
  ViewConfig,
  ViewContext,
} from './types.js';
import type { ViewPropsFor } from './view-props.js';
import type { EscapeHandler } from './escape.js';
import { parseViewName } from './view-namespaces.js';
import {
  ViewRegistry,
  type CustomDirectiveHandler,
  type ViewAuthBindings,
  type ViewComponentBinding,
  type ViewComposerHandler,
  type ViewExpressionBindings,
  type ViewFormBindings,
  type ViewInjector,
  type ViewLocaleBindings,
} from './view-registry.js';
import { ViewHelpers } from './view-helpers.js';
import { renderEchoBootstrap } from './echo-helpers.js';
import type { EchoClientConfig } from './echo-types.js';
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
  private echoClientConfig: EchoClientConfig | null = null;
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

  getLocale(): string {
    return this.localeCode;
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

  setInjector(injector: ViewInjector | undefined): this {
    this.registry.setInjector(injector);
    return this;
  }

  escape(context: string, handler: EscapeHandler): this {
    this.registry.escape(context, handler);
    return this;
  }

  getComponentCatalog(): ComponentCatalogEntry[] {
    return buildComponentCatalog(this.basePath, this.config, this.namespaces);
  }

  getViewCatalog(): ViewCatalog {
    return buildViewCatalog(this.basePath, this.config, this.namespaces);
  }

  getIslandCatalog(): IslandCatalogEntry[] {
    return buildViewCatalog(this.basePath, this.config, this.namespaces).islands;
  }

  async getCompiledTemplate(name: string): Promise<CompiledTemplate> {
    return this.loadTemplate(await this.resolveName(name));
  }

  setCompiledCachePath(path: string | null): this {
    this.compiledCacheDirectory = path ?? undefined;
    return this;
  }

  getRegistry(): ViewRegistry {
    return this.registry;
  }

  getViewExtension(): string {
    return this.extension;
  }

  getProgrammaticExtension(): string {
    return this.config.programmaticExtension ?? '.tyr.ts';
  }

  getWatchedExtensions(): string[] {
    return [this.extension, this.getProgrammaticExtension()];
  }

  getViewRoots(): string[] {
    return [this.viewsRoot, ...this.namespaces.values()];
  }

  async sourcePathFor(name: string): Promise<string> {
    return this.resolvePath(await this.resolveName(name));
  }

  viewNameFromPath(filePath: string, root: string): string {
    const relative = filePath
      .slice(root.length)
      .replace(/^[\\/]/, '')
      .replace(/\\/g, '/');
    const programmaticExtension = this.getProgrammaticExtension();
    const withoutExtension = relative.endsWith(programmaticExtension)
      ? relative.slice(0, -programmaticExtension.length)
      : relative.slice(0, -this.extension.length);
    const dotted = withoutExtension.replace(/\//g, '.');

    for (const [namespace, namespaceRoot] of this.namespaces.entries()) {
      if (root === namespaceRoot) {
        return `${namespace}::${dotted}`;
      }
    }

    return dotted;
  }

  buildEvaluationContext(context: ViewContext): ViewContext {
    return mergeEvaluationContext(context, this.registry.getBindings());
  }

  async resolveName(name: string): Promise<string> {
    const parsed = parseViewName(name);

    if (parsed.namespace) {
      return name;
    }

    if (await this.existsAt(name)) {
      return name;
    }

    const anonymous = `components.${name}`;
    if (await this.existsAt(anonymous)) {
      return anonymous;
    }

    return name;
  }

  async renderFragment<TName extends string>(
    name: TName,
    fragmentName: string,
    context: ViewPropsFor<TName> = {} as ViewPropsFor<TName>,
  ): Promise<string> {
    const resolved = await this.resolveName(name);
    const composed = await this.registry.applyComposers(resolved, context as ViewContext);
    const renderContext = this.buildEvaluationContext(
      this.mergeFormContext(composed as ViewContext),
    );
    const template = await this.loadTemplate(resolved);

    if (this.config.validateProps !== false && template.props) {
      validateViewProps(template.props, renderContext, resolved);
    }

    const body = findFragmentBody(template.ops, fragmentName);
    if (!body) {
      throw new ViewFragmentNotFoundError(resolved, fragmentName);
    }

    const helpers = new ViewHelpers();
    await renderOps(body, renderContext, helpers, this, {
      viewPath: this.resolvePath(resolved),
    });
    return helpers.toString();
  }

  async render<TName extends string>(
    name: TName,
    context: ViewPropsFor<TName> = {} as ViewPropsFor<TName>,
    parentSections?: ReadonlyMap<string, string>,
    parentStacks?: Map<string, string[]>,
    parentOnceRendered?: Set<string>,
    parentComponentPropsStack?: Record<string, unknown>[],
    parentStackOncePushed?: Set<string>,
    renderOptions: RenderOptions = {},
  ): Promise<string> {
    const resolved = await this.resolveName(name);
    const composed = await this.registry.applyComposers(resolved, context as ViewContext);
    const renderContext = this.buildEvaluationContext(
      this.mergeFormContext(composed as ViewContext),
    );

    if (!parentSections && renderOptions.mode !== 'stream-shell') {
      this.registry.resetHydrationManifest();
    }

    if (await this.isProgrammatic(resolved)) {
      return this.renderProgrammatic(resolved, renderContext);
    }

    return this.renderCompiled(
      resolved,
      renderContext,
      parentSections,
      parentStacks,
      parentOnceRendered,
      parentComponentPropsStack,
      parentStackOncePushed,
      renderOptions,
    );
  }

  async *renderStream<TName extends string>(
    name: TName,
    context: ViewPropsFor<TName> = {} as ViewPropsFor<TName>,
    handlers: Record<string, (ctx: ViewContext) => Promise<string>> = {},
  ): AsyncGenerator<string> {
    const resolved = await this.resolveName(name);
    const composed = await this.registry.applyComposers(resolved, context as ViewContext);
    const renderContext = this.buildEvaluationContext(
      this.mergeFormContext(composed as ViewContext),
    );

    this.registry.resetHydrationManifest();

    if (await this.isProgrammatic(resolved)) {
      yield await this.renderProgrammatic(resolved, renderContext);
      return;
    }

    const streamSections: Array<{ name: string; body: TemplateOp[] }> = [];
    const shell = await this.render(
      resolved,
      renderContext,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { mode: 'stream-shell', streamSections },
    );

    let cursor = 0;
    for (const section of streamSections) {
      const placeholder = streamPlaceholder(section.name);
      const index = shell.indexOf(placeholder, cursor);
      if (index === -1) {
        continue;
      }

      if (index > cursor) {
        yield shell.slice(cursor, index);
      }

      cursor = index + placeholder.length;

      const handler = handlers[section.name];
      yield handler
        ? await handler(renderContext)
        : await this.renderStreamSection(section.body, renderContext);
    }

    if (cursor < shell.length) {
      yield shell.slice(cursor);
    }
  }

  getHydrationManifest(): { islands: import('./hydration.js').HydrationIsland[] } {
    return this.registry.getHydrationManifest().toJSON();
  }

  async exists(name: string): Promise<boolean> {
    if (await this.existsAt(name)) {
      return true;
    }

    if (await this.isProgrammatic(await this.resolveName(name))) {
      return true;
    }

    const parsed = parseViewName(name);
    if (!parsed.namespace) {
      return await this.existsAt(`components.${name}`);
    }

    return false;
  }

  private async renderCompiled(
    resolved: string,
    renderContext: ViewContext,
    parentSections?: ReadonlyMap<string, string>,
    parentStacks?: Map<string, string[]>,
    parentOnceRendered?: Set<string>,
    parentComponentPropsStack?: Record<string, unknown>[],
    parentStackOncePushed?: Set<string>,
    renderOptions: RenderOptions = {},
  ): Promise<string> {
    const template = await this.loadTemplate(resolved);

    if (this.config.validateProps !== false && template.props) {
      validateViewProps(template.props, renderContext, resolved);
    }

    const helpers = new ViewHelpers(
      parentStacks,
      parentOnceRendered,
      parentComponentPropsStack,
      parentStackOncePushed,
    );

    if (parentSections) {
      helpers.importSections(parentSections);
    }

    const optionsWithPath: RenderOptions = {
      ...renderOptions,
      viewPath: this.resolvePath(resolved),
      streamSections: renderOptions.streamSections,
    };

    await renderOps(template.ops, renderContext, helpers, this, optionsWithPath);

    if (template.layout) {
      const layoutHelpers = new ViewHelpers(
        helpers.getStacks(),
        helpers.getOnceRendered(),
        helpers.getComponentPropsStack(),
        helpers.getStackOncePushed(),
      );
      layoutHelpers.importSections(helpers.getSections());
      await renderOps(
        (await this.loadTemplate(template.layout)).ops,
        renderContext,
        layoutHelpers,
        this,
        {
          ...optionsWithPath,
          viewPath: this.resolvePath(template.layout),
        },
      );
      return layoutHelpers.toString();
    }

    return helpers.toString();
  }

  private async renderStreamSection(
    body: TemplateOp[],
    context: ViewContext,
  ): Promise<string> {
    const helpers = new ViewHelpers();
    await renderOps(body, context, helpers, this);
    return helpers.toString();
  }

  async renderProgrammaticIsland(id: string, context: ViewContext): Promise<string> {
    for (const name of [`islands.${id}`, id]) {
      if (await this.isProgrammatic(await this.resolveName(name))) {
        return this.renderProgrammatic(name, context);
      }
    }

    return '';
  }

  private async renderProgrammatic(name: string, context: ViewContext): Promise<string> {
    const filePath = this.programmaticPathFor(this.resolvePath(name));
    const module = await loadProgrammaticView(filePath);
    const output = await module.render(context);
    return String(output ?? '');
  }

  private async isProgrammatic(name: string): Promise<boolean> {
    try {
      await access(this.programmaticPathFor(this.resolvePath(name)));
      return true;
    } catch {
      return false;
    }
  }

  private async isProgrammaticOnly(name: string): Promise<boolean> {
    try {
      const tyrPath = this.resolvePath(name);
      const [hasProgrammatic, hasTyr] = await Promise.all([
        access(this.programmaticPathFor(tyrPath)).then(
          () => true,
          () => false,
        ),
        access(tyrPath).then(
          () => true,
          () => false,
        ),
      ]);
      return hasProgrammatic && !hasTyr;
    } catch {
      return false;
    }
  }

  private programmaticPathFor(tyrPath: string): string {
    const programmaticExtension = this.config.programmaticExtension ?? '.tyr.ts';
    if (tyrPath.endsWith(this.extension)) {
      return `${tyrPath.slice(0, -this.extension.length)}${programmaticExtension}`;
    }
    return `${tyrPath}${programmaticExtension}`;
  }

  setEchoClientConfig(config: EchoClientConfig | null): void {
    this.echoClientConfig = config;
  }

  renderVite(entry: string): string {
    if (!this.viteManifest) {
      this.viteManifest = readViteManifest(this.manifestPath);
    }
    return renderViteTags(this.viteManifest, entry, this.viteBase);
  }

  renderEcho(entry = 'resources/client/echo.ts'): string {
    if (!this.viteManifest) {
      this.viteManifest = readViteManifest(this.manifestPath);
    }
    return renderEchoBootstrap(
      this.echoClientConfig,
      this.viteManifest,
      entry,
      this.viteBase,
    );
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
    for (const name of await this.listViewNames()) {
      await this.loadTemplate(name);
      warmed += 1;
    }
    return warmed;
  }

  async clearCompiledCache(): Promise<number> {
    if (!this.compiledCacheDirectory) {
      return 0;
    }

    this.cache.clear();
    return clearCompiledCacheDir(this.compiledCacheDirectory);
  }

  async listViewNames(): Promise<string[]> {
    const names = await discoverViewNames(this.viewsRoot, this.extension);
    for (const [namespace, root] of this.namespaces.entries()) {
      for (const view of await discoverViewNames(root, this.extension)) {
        names.push(`${namespace}::${view}`);
      }
    }
    return names;
  }

  private async existsAt(name: string): Promise<boolean> {
    try {
      await stat(this.resolvePath(name));
      return true;
    } catch {
      return false;
    }
  }

  invalidateTemplate(name: string): void {
    const path = this.resolvePath(name);
    this.cache.delete(path);
  }

  async recompileTemplate(name: string): Promise<CompiledTemplate> {
    this.invalidateTemplate(name);
    return this.loadTemplate(await this.resolveName(name));
  }

  private async loadTemplate(name: string): Promise<CompiledTemplate> {
    if (await this.isProgrammaticOnly(name)) {
      throw new ViewCompileError(
        `View "${name}" is a programmatic .tyr.ts template and has no compiled ops. Use render() instead of getCompiledTemplate().`,
        { viewPath: this.programmaticPathFor(this.resolvePath(name)) },
      );
    }

    const path = this.resolvePath(name);
    const registryVersion = this.registry.getCompileVersion();
    const compileOptions: CompileOptions = {
      customDirectives: this.registry.getDirectiveNames(),
      viewPath: path,
    };

    if (this.compiledCacheDirectory) {
      const cacheFile = cacheFileForView(this.compiledCacheDirectory, this.viewsRoot, path);
      const diskEntry = await readCompiledCache(cacheFile);

      if (diskEntry && diskEntry.registryVersion === registryVersion) {
        if (this.shouldTrustDiskCache()) {
          this.cache.set(path, {
            mtimeMs: diskEntry.mtimeMs,
            registryVersion,
            template: diskEntry.template,
          });
          return diskEntry.template;
        }

        const stats = await stat(path);
        if (diskEntry.mtimeMs === stats.mtimeMs) {
          this.cache.set(path, {
            mtimeMs: stats.mtimeMs,
            registryVersion,
            template: diskEntry.template,
          });
          return diskEntry.template;
        }
      }

      if (shouldRequireCompiledCache(this.config, this.shouldTrustDiskCache())) {
        throw new CompiledViewCacheMissError(name, this.compiledCacheDirectory);
      }
    }

    const cached = this.cache.get(path);
    const stats = await stat(path);

    if (
      cached &&
      cached.mtimeMs === stats.mtimeMs &&
      cached.registryVersion === registryVersion
    ) {
      return cached.template;
    }

    const source = await readFile(path, 'utf8');
    const template = this.compileSource(source, compileOptions);
    const memoryEntry = { mtimeMs: stats.mtimeMs, registryVersion, template };
    this.cache.set(path, memoryEntry);

    if (this.compiledCacheDirectory) {
      const cacheFile = cacheFileForView(this.compiledCacheDirectory, this.viewsRoot, path);
      await writeCompiledCache(cacheFile, memoryEntry);
    }

    return template;
  }

  private compileSource(source: string, options: CompileOptions): CompiledTemplate {
    try {
      return compile(source, options);
    } catch (error) {
      if (error instanceof ViewCompileError) {
        throw error;
      }
      throw new ViewCompileError(String(error), { viewPath: options.viewPath });
    }
  }

  private shouldTrustDiskCache(): boolean {
    if (!this.compiledCacheDirectory || !this.config.compiled) {
      return false;
    }

    if (this.config.trustCompiledCache !== undefined) {
      return this.config.trustCompiledCache;
    }

    return this.registry.getEnvironment() === 'production';
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
      __: (key: string, replacements: Record<string, string | number> = {}) =>
        this.translate(String(key), replacements),
    });
  }
}