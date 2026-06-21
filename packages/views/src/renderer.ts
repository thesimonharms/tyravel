import { isIterableEmpty, isViewEmpty, isViewSet } from './conditions.js';
import { escapeHtml } from './escape.js';
import { evaluateExpression, parseForeachExpression } from './evaluate.js';
import type { TemplateOp, ViewContext } from './types.js';
import type { ViewEngine } from './view-engine.js';
import { ViewHelpers } from './view-helpers.js';

export async function renderOps(
  ops: TemplateOp[],
  context: ViewContext,
  helpers: ViewHelpers,
  engine: ViewEngine,
): Promise<void> {
  for (const op of ops) {
    switch (op.type) {
      case 'text':
        helpers.append(op.value);
        break;

      case 'echo': {
        const value = evaluateExpression(op.expression, context);
        helpers.append(op.raw ? String(value ?? '') : escapeHtml(value));
        break;
      }

      case 'if': {
        const result = await evaluateConditional(op, context, engine);
        if (result) {
          await renderOps(op.body, context, helpers, engine);
        } else if (op.elseBody) {
          await renderOps(op.elseBody, context, helpers, engine);
        }
        break;
      }

      case 'forelse': {
        if (isIterableEmpty(op.expression, context)) {
          await renderOps(op.emptyBody, context, helpers, engine);
        } else {
          await renderForeachBody(op.expression, op.body, context, helpers, engine);
        }
        break;
      }

      case 'foreach': {
        await renderForeachBody(op.expression, op.body, context, helpers, engine);
        break;
      }

      case 'section': {
        const sectionHelpers = new ViewHelpers(helpers.getStacks());
        await renderOps(op.body, context, sectionHelpers, engine);
        helpers.setSection(op.name, sectionHelpers.toString());
        break;
      }

      case 'push': {
        const pushHelpers = new ViewHelpers(helpers.getStacks());
        await renderOps(op.body, context, pushHelpers, engine);
        helpers.pushStack(op.name, pushHelpers.toString());
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
        if (engine.exists(op.name)) {
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

      case 'custom': {
        const handler = engine.getRegistry().getDirective(op.name);
        if (!handler) {
          break;
        }
        const output = await handler(op.expression, context);
        helpers.append(String(output ?? ''));
        break;
      }

      case 'component': {
        const props = op.dataExpression
          ? ((evaluateExpression(op.dataExpression, context) as ViewContext) ?? {})
          : {};
        const childContext: ViewContext = {
          ...context,
          ...(typeof props === 'object' && props !== null ? props : {}),
        };

        if (op.defaultSlot) {
          const slotHelpers = new ViewHelpers(helpers.getStacks());
          await renderOps(op.defaultSlot, context, slotHelpers, engine);
          childContext.$slot = slotHelpers.toString();
        }

        if (op.namedSlots) {
          for (const [slotName, slotOps] of Object.entries(op.namedSlots)) {
            const slotHelpers = new ViewHelpers(helpers.getStacks());
            await renderOps(slotOps, context, slotHelpers, engine);
            childContext[`$${slotName}`] = slotHelpers.toString();
          }
        }

        const html = await engine.render(
          op.name,
          childContext,
          helpers.getSections(),
          helpers.getStacks(),
        );
        helpers.append(html);
        break;
      }
    }
  }
}

async function evaluateConditional(
  op: Extract<TemplateOp, { type: 'if' }>,
  context: ViewContext,
  engine: ViewEngine,
): Promise<boolean> {
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
      const checked = result instanceof Promise ? await result : result;
      return !checked;
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
    default:
      return Boolean(evaluateExpression(op.expression, context));
  }
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
  return engine.render(name, data, helpers.getSections(), helpers.getStacks());
}

async function renderForeachBody(
  expression: string,
  body: TemplateOp[],
  context: ViewContext,
  helpers: ViewHelpers,
  engine: ViewEngine,
): Promise<void> {
  const parsed = parseForeachExpression(expression);
  if (!parsed) {
    return;
  }

  const items = evaluateExpression(parsed.itemsExpression, context);
  if (!items || typeof items !== 'object') {
    return;
  }

  const iterable = Array.isArray(items)
    ? items.entries()
    : Object.entries(items as Record<string, unknown>);

  for (const [key, value] of iterable) {
    const loopContext: ViewContext = {
      ...context,
      [parsed.valueName]: value,
    };

    if (parsed.keyName) {
      loopContext[parsed.keyName] = key;
    }

    await renderOps(body, loopContext, helpers, engine);
  }
}