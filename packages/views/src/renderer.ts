import {
  evaluateConditionalMap,
  mergeComponentProps,
  renderClassDirective,
  renderStyleDirective,
} from './component-helpers.js';
import { parseQuotedStrings } from './directive-parsers.js';
import { isIterableEmpty, isIterableValueEmpty, isViewEmpty, isViewSet } from './conditions.js';
import { escapeHtml } from './escape.js';
import { renderIslandWrapper } from './hydration.js';
import { streamPlaceholder } from './streaming.js';
import {
  evaluateExpression,
  parseForeachExpression,
  readContextPath,
} from './evaluate.js';
import {
  encodeJsonForHtml,
  renderCsrfField,
  renderFormAttribute,
  renderMethodField,
  switchMatches,
} from './form-helpers.js';
import { buildComponentMemoKey } from './component-memo-cache.js';
import type { RenderOptions, TemplateOp, ViewContext } from './types.js';
import { ViewAttributeBag } from './view-attributes.js';
import { ViewErrorBag } from './view-errors.js';
import type { ViewEngine } from './view-engine.js';
import { ViewHelpers } from './view-helpers.js';

export async function renderOps(
  ops: TemplateOp[],
  context: ViewContext,
  helpers: ViewHelpers,
  engine: ViewEngine,
  renderOptions: RenderOptions = {},
): Promise<void> {
  const registry = engine.getRegistry();

  for (const op of ops) {
    switch (op.type) {
      case 'text':
        helpers.append(op.value);
        break;

      case 'pathEcho': {
        const value = readContextPath(context, op.path);
        if (value instanceof ViewAttributeBag) {
          helpers.append(value.toHtml());
          break;
        }
        helpers.append(op.raw ? String(value ?? '') : escapeHtml(value));
        break;
      }

      case 'echo': {
        const value = evaluateExpression(op.expression, context);
        if (value instanceof ViewAttributeBag) {
          helpers.append(value.toHtml());
          break;
        }
        helpers.append(op.raw ? String(value ?? '') : escapeHtml(value));
        break;
      }

      case 'if': {
        const result = evaluateConditional(op, context, engine);
        const matched = result instanceof Promise ? await result : result;
        if (matched) {
          await renderOps(op.body, context, helpers, engine, renderOptions);
        } else if (op.elseBody) {
          await renderOps(op.elseBody, context, helpers, engine, renderOptions);
        }
        break;
      }

      case 'switch': {
        const switchValue = evaluateExpression(op.expression, context);
        let matched = false;

        for (const switchCase of op.cases) {
          if (switchCase.labelExpression === undefined) {
            continue;
          }

          const caseValue = evaluateExpression(switchCase.labelExpression, context);
          if (switchMatches(switchValue, caseValue)) {
            await renderOps(switchCase.body, context, helpers, engine, renderOptions);
            matched = true;
            break;
          }
        }

        if (!matched && op.defaultBody) {
          await renderOps(op.defaultBody, context, helpers, engine, renderOptions);
        }
        break;
      }

      case 'csrf': {
        const token = registry.getForm()?.csrfToken() ?? '';
        if (token) {
          helpers.append(renderCsrfField(token));
        }
        break;
      }

      case 'method':
        helpers.append(renderMethodField(op.verb));
        break;

      case 'json': {
        const value = evaluateExpression(op.expression, context);
        helpers.append(encodeJsonForHtml(value));
        break;
      }

      case 'formAttr': {
        const active = Boolean(evaluateExpression(op.expression, context));
        helpers.append(renderFormAttribute(op.attribute, active));
        break;
      }

      case 'class': {
        const value = evaluateConditionalMap(op.expression, context);
        helpers.append(renderClassDirective(value));
        break;
      }

      case 'style': {
        const value = evaluateConditionalMap(op.expression, context);
        helpers.append(renderStyleDirective(value));
        break;
      }

      case 'forelse': {
        const parsed = parseForeachExpression(op.expression);
        const items = evaluateExpression(
          parsed?.itemsExpression ?? op.expression,
          context,
        );

        if (isIterableValueEmpty(items)) {
          await renderOps(op.emptyBody, context, helpers, engine, renderOptions);
        } else {
          await renderForeachBody(
            op.expression,
            op.body,
            context,
            helpers,
            engine,
            renderOptions,
            parsed,
            items,
          );
        }
        break;
      }

      case 'foreach': {
        await renderForeachBody(
          op.expression,
          op.body,
          context,
          helpers,
          engine,
          renderOptions,
        );
        break;
      }

      case 'once': {
        if (!helpers.hasRenderedOnce(op.id)) {
          helpers.markOnceRendered(op.id);
          await renderOps(op.body, context, helpers, engine, renderOptions);
        }
        break;
      }

      case 'section': {
        const sectionHelpers = new ViewHelpers(
          helpers.getStacks(),
          helpers.getOnceRendered(),
          helpers.getComponentPropsStack(),
          helpers.getStackOncePushed(),
        );
        await renderOps(op.body, context, sectionHelpers, engine, renderOptions);
        helpers.setSection(op.name, sectionHelpers.toString());
        break;
      }

      case 'push': {
        const pushHelpers = new ViewHelpers(
          helpers.getStacks(),
          helpers.getOnceRendered(),
          helpers.getComponentPropsStack(),
          helpers.getStackOncePushed(),
        );
        await renderOps(op.body, context, pushHelpers, engine, renderOptions);
        helpers.pushStack(op.name, pushHelpers.toString());
        break;
      }

      case 'pushOnce': {
        const pushHelpers = new ViewHelpers(
          helpers.getStacks(),
          helpers.getOnceRendered(),
          helpers.getComponentPropsStack(),
          helpers.getStackOncePushed(),
        );
        await renderOps(op.body, context, pushHelpers, engine, renderOptions);
        helpers.pushStackOnce(op.name, op.id, pushHelpers.toString());
        break;
      }

      case 'prepend': {
        const prependHelpers = new ViewHelpers(
          helpers.getStacks(),
          helpers.getOnceRendered(),
          helpers.getComponentPropsStack(),
          helpers.getStackOncePushed(),
        );
        await renderOps(op.body, context, prependHelpers, engine, renderOptions);
        helpers.prependStack(op.name, prependHelpers.toString());
        break;
      }

      case 'inject': {
        const injector = registry.getInjector();
        if (!injector) {
          const environment = registry.getEnvironment();
          if (environment === 'local' || environment === 'development') {
            throw new Error(
              `@inject('${op.varName}', '${op.binding}') requires a view injector. ` +
                'Register ViewServiceProvider or call engine.setInjector().',
            );
          }
          break;
        }

        const value = await injector(op.binding);
        context[op.varName] = value;
        break;
      }

      case 'fragment': {
        const cache = registry.getFragmentCache();
        const cacheKey = renderOptions.viewPath
          ? `${renderOptions.viewPath}::${op.name}`
          : op.name;
        const cached = await cache.get(cacheKey);
        if (cached !== null) {
          helpers.append(cached);
          break;
        }

        const fragmentHelpers = new ViewHelpers(
          helpers.getStacks(),
          helpers.getOnceRendered(),
          helpers.getComponentPropsStack(),
          helpers.getStackOncePushed(),
        );
        await renderOps(op.body, context, fragmentHelpers, engine, renderOptions);
        const rendered = fragmentHelpers.toString();
        await cache.put(cacheKey, rendered, op.ttlSeconds);
        helpers.append(rendered);
        break;
      }

      case 'escape': {
        const handler =
          registry.getEscapeHandler(op.context) ?? escapeHtml;
        const value = evaluateExpression(op.expression, context);
        helpers.append(handler(value));
        break;
      }

      case 'stream': {
        if (renderOptions.mode === 'stream-shell') {
          renderOptions.streamSections?.push({ name: op.name, body: op.body });
          helpers.append(streamPlaceholder(op.name));
          break;
        }

        const streamHelpers = new ViewHelpers(
          helpers.getStacks(),
          helpers.getOnceRendered(),
          helpers.getComponentPropsStack(),
          helpers.getStackOncePushed(),
        );
        await renderOps(op.body, context, streamHelpers, engine, renderOptions);
        helpers.append(streamHelpers.toString());
        break;
      }

      case 'island': {
        const props = op.propsExpression
          ? ((evaluateExpression(op.propsExpression, context) as Record<string, unknown>) ??
            {})
          : {};
        const islandContext: ViewContext = { ...context, ...props };
        let inner: string;

        if (isTemplateOpsEmpty(op.body)) {
          inner = await engine.renderProgrammaticIsland(op.id, islandContext);
        } else {
          const islandHelpers = new ViewHelpers(
            helpers.getStacks(),
            helpers.getOnceRendered(),
            helpers.getComponentPropsStack(),
            helpers.getStackOncePushed(),
          );
          await renderOps(op.body, islandContext, islandHelpers, engine, renderOptions);
          inner = islandHelpers.toString();
        }

        registry.getHydrationManifest().register(op.id, inner, props);
        helpers.append(renderIslandWrapper(op.id, inner, props));
        break;
      }

      case 'stack':
        helpers.append(helpers.renderStack(op.name, op.defaultValue ?? ''));
        break;

      case 'yield':
        helpers.append(helpers.yield(op.name, op.defaultValue ?? ''));
        break;

      case 'include':
        helpers.append(
          await renderInclude(op.name, op.dataExpression, context, helpers, engine),
        );
        break;

      case 'includeIf':
        if (await engine.exists(op.name)) {
          helpers.append(
            await renderInclude(op.name, op.dataExpression, context, helpers, engine),
          );
        }
        break;

      case 'includeWhen': {
        const shouldInclude = Boolean(evaluateExpression(op.conditionExpression, context));
        if (shouldInclude) {
          helpers.append(
            await renderInclude(op.name, op.dataExpression, context, helpers, engine),
          );
        }
        break;
      }

      case 'includeFirst': {
        for (const name of op.names) {
          if (!(await engine.exists(name))) {
            continue;
          }
          helpers.append(
            await renderInclude(name, op.dataExpression, context, helpers, engine),
          );
          break;
        }
        break;
      }

      case 'lang': {
        const replacements = op.replaceExpression
          ? ((evaluateExpression(op.replaceExpression, context) as Record<
              string,
              string | number
            >) ?? {})
          : {};
        helpers.append(escapeHtml(engine.translate(op.key, replacements)));
        break;
      }

      case 'vite':
        helpers.append(engine.renderVite(op.entry));
        break;

      case 'echoClient':
        helpers.append(engine.renderEcho(op.entry));
        break;

      case 'custom': {
        const handler = registry.getDirective(op.name);
        if (!handler) {
          break;
        }
        const output = await handler(op.expression, context);
        helpers.append(String(output ?? ''));
        break;
      }

      case 'component': {
        const resolvedName = await engine.resolveName(op.name);
        const template = await engine.getCompiledTemplate(op.name);
        const passed = op.dataExpression
          ? ((evaluateExpression(op.dataExpression, context) as ViewContext) ?? {})
          : {};
        const passedProps =
          typeof passed === 'object' && passed !== null ? passed : {};

        const provider =
          registry.getComponent(resolvedName) ??
          registry.getComponent(op.name);
        const hasDynamicSlots = Boolean(op.defaultSlot || op.namedSlots);
        const memoEnabled = template.memo !== undefined && !hasDynamicSlots;
        const memoCache = registry.getComponentMemoCache();

        if (memoEnabled && !provider && !hasDynamicSlots) {
          const earlyKey = buildComponentMemoKey(
            resolvedName,
            passedProps as Record<string, unknown>,
          );
          if (earlyKey) {
            const cached = await memoCache.get(earlyKey);
            if (cached !== null) {
              helpers.append(cached);
              break;
            }
          }
        }

        const providerData = provider ? await provider.data(context) : {};

        const { props: mergedProps, attributes } = mergeComponentProps(
          template.props,
          { ...providerData, ...passedProps },
          template.props !== undefined,
        );

        if (template.aware?.length) {
          Object.assign(mergedProps, helpers.resolveAwareProps(template.aware));
        }

        const childContext: ViewContext = {
          ...context,
          ...mergedProps,
          $attributes: new ViewAttributeBag(attributes),
        };

        if (op.defaultSlot) {
          const slotHelpers = new ViewHelpers(
            helpers.getStacks(),
            helpers.getOnceRendered(),
            helpers.getComponentPropsStack(),
            helpers.getStackOncePushed(),
          );
          await renderOps(op.defaultSlot, context, slotHelpers, engine, renderOptions);
          childContext.$slot = slotHelpers.toString();
        }

        if (op.namedSlots) {
          for (const [slotName, slotOps] of Object.entries(op.namedSlots)) {
            const slotHelpers = new ViewHelpers(
              helpers.getStacks(),
              helpers.getOnceRendered(),
              helpers.getComponentPropsStack(),
              helpers.getStackOncePushed(),
            );
            await renderOps(slotOps, context, slotHelpers, engine, renderOptions);
            childContext[`$${slotName}`] = slotHelpers.toString();
          }
        }

        if (template.defaultSlots) {
          for (const [slotName, slotOps] of Object.entries(template.defaultSlots)) {
            if (op.namedSlots?.[slotName]) {
              continue;
            }

            const slotHelpers = new ViewHelpers(
              helpers.getStacks(),
              helpers.getOnceRendered(),
              helpers.getComponentPropsStack(),
              helpers.getStackOncePushed(),
            );
            await renderOps(slotOps, childContext, slotHelpers, engine, renderOptions);
            childContext[`$${slotName}`] = slotHelpers.toString();
          }
        }

        const memoKey = memoEnabled
          ? buildComponentMemoKey(resolvedName, mergedProps as Record<string, unknown>)
          : undefined;
        const memoTtl = typeof template.memo === 'number' ? template.memo : undefined;

        if (memoKey) {
          const cached = await memoCache.get(memoKey);
          if (cached !== null) {
            helpers.append(cached);
            break;
          }
        }

        helpers.pushComponentProps(mergedProps);
        try {
          const html = await engine.render(
            resolvedName,
            childContext,
            helpers.getSections(),
            helpers.getStacks(),
            helpers.getOnceRendered(),
            helpers.getComponentPropsStack(),
            helpers.getStackOncePushed(),
          );
          helpers.append(html);

          if (memoKey) {
            await memoCache.put(memoKey, html, memoTtl);
          }
        } finally {
          helpers.popComponentProps();
        }
        break;
      }

    }
  }
}

function evaluateConditional(
  op: Extract<TemplateOp, { type: 'if' }>,
  context: ViewContext,
  engine: ViewEngine,
): boolean | Promise<boolean> {
  const auth = engine.getRegistry().getAuth();

  switch (op.mode) {
    case 'unless':
      return !Boolean(evaluateExpression(op.expression, context));
    case 'isset':
      return isViewSet(op.expression, context);
    case 'empty':
      return isViewEmpty(evaluateExpression(op.expression, context));
    case 'auth': {
      if (!auth) {
        return false;
      }
      const result = auth.check();
      return result instanceof Promise ? result : result;
    }
    case 'guest': {
      if (!auth) {
        return true;
      }
      const result = auth.check();
      if (result instanceof Promise) {
        return result.then((checked) => !checked);
      }
      return !result;
    }
    case 'can': {
      if (!auth) {
        return false;
      }
      const parsed = parseCanExpression(op.expression);
      const model =
        parsed.modelExpression === undefined
          ? undefined
          : evaluateExpression(parsed.modelExpression, context);
      const result = auth.can(parsed.ability, model);
      return result instanceof Promise ? result : result;
    }
    case 'error': {
      const errors = resolveErrorBag(context);
      return errors.has(op.expression);
    }
    case 'env': {
      const current = engine.getRegistry().getEnvironment();
      const allowed = parseQuotedStrings(op.expression);
      return allowed.includes(current);
    }
    case 'production':
      return engine.getRegistry().getEnvironment() === 'production';
    case 'local':
      return engine.getRegistry().getEnvironment() === 'local';
    default:
      return Boolean(evaluateExpression(op.expression, context));
  }
}

function isTemplateOpsEmpty(ops: TemplateOp[]): boolean {
  for (const op of ops) {
    if (op.type !== 'text' || op.value.trim() !== '') {
      return false;
    }
  }

  return true;
}

function resolveErrorBag(context: ViewContext): ViewErrorBag {
  const bag = context.$errors;
  if (bag instanceof ViewErrorBag) {
    return bag;
  }
  return new ViewErrorBag();
}

function parseCanExpression(expression: string): {
  ability: string;
  modelExpression?: string;
} {
  const quoted = expression.match(/^['"]([^'"]+)['"]\s*(?:,\s*(.+))?$/);
  if (quoted) {
    return {
      ability: quoted[1]!,
      modelExpression: quoted[2]?.trim(),
    };
  }

  const [ability, ...rest] = expression.split(',').map((part) => part.trim());
  return {
    ability: ability ?? '',
    modelExpression: rest.length > 0 ? rest.join(', ') : undefined,
  };
}

async function renderInclude(
  name: string,
  dataExpression: string | undefined,
  context: ViewContext,
  helpers: ViewHelpers,
  engine: ViewEngine,
): Promise<string> {
  const data = dataExpression
    ? (evaluateExpression(dataExpression, context) as ViewContext)
    : context;
  return engine.render(
    await engine.resolveName(name),
    data,
    helpers.getSections(),
    helpers.getStacks(),
    helpers.getOnceRendered(),
    helpers.getComponentPropsStack(),
    helpers.getStackOncePushed(),
  );
}

async function renderForeachBody(
  expression: string,
  body: TemplateOp[],
  context: ViewContext,
  helpers: ViewHelpers,
  engine: ViewEngine,
  renderOptions: RenderOptions = {},
  parsedInput?: ReturnType<typeof parseForeachExpression>,
  itemsInput?: unknown,
): Promise<void> {
  const parsed = parsedInput ?? parseForeachExpression(expression);
  if (!parsed) {
    return;
  }

  const items = itemsInput ?? evaluateExpression(parsed.itemsExpression, context);
  if (!items || typeof items !== 'object') {
    return;
  }

  const iterable = Array.isArray(items)
    ? items.entries()
    : Object.entries(items as Record<string, unknown>);

  const loopContext: ViewContext = { ...context };

  for (const [key, value] of iterable) {
    loopContext[parsed.valueName] = value;
    if (parsed.keyName) {
      loopContext[parsed.keyName] = key;
    }

    await renderOps(body, loopContext, helpers, engine, renderOptions);
  }
}