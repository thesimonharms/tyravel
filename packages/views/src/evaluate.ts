import type { ViewExpressionBindings } from './view-registry.js';
import type { ViewContext } from './types.js';

const EXPRESSION_CACHE_MAX = 2048;
const expressionCache = new Map<string, (...args: unknown[]) => unknown>();
const foreachParseCache = new Map<string, ReturnType<typeof parseForeachExpressionUncached>>();
export const SIMPLE_PATH = /^[\w]+(?:\.[\w]+)*$/;

export function readContextPath(context: ViewContext, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = context;

  for (const part of parts) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

export function mergeEvaluationContext(
  context: ViewContext,
  bindings?: ViewExpressionBindings,
): ViewContext {
  if (!bindings) {
    return context;
  }

  let hasFunctions = false;
  for (const value of Object.values(bindings)) {
    if (typeof value === 'function') {
      hasFunctions = true;
      break;
    }
  }

  if (!hasFunctions) {
    return context;
  }

  const merged: ViewContext = { ...context };

  for (const [key, value] of Object.entries(bindings)) {
    if (typeof value === 'function') {
      merged[key] = value;
    }
  }

  return merged;
}

export function evaluateExpression(expression: string, context: ViewContext): unknown {
  const trimmed = expression.trim();
  if (!trimmed) {
    return '';
  }

  if (SIMPLE_PATH.test(trimmed)) {
    return readContextPath(context, trimmed);
  }

  const keys = Object.keys(context);
  const cacheKey = `${trimmed}\0${keys.join('\0')}`;
  let evaluator = expressionCache.get(cacheKey);

  if (!evaluator) {
    try {
      evaluator = Function(...keys, `"use strict"; return (${trimmed});`) as (
        ...args: unknown[]
      ) => unknown;
      if (expressionCache.size >= EXPRESSION_CACHE_MAX) {
        const oldest = expressionCache.keys().next().value;
        if (oldest) {
          expressionCache.delete(oldest);
        }
      }
      expressionCache.set(cacheKey, evaluator);
    } catch {
      return undefined;
    }
  }

  try {
    return evaluator(...Object.values(context));
  } catch {
    return undefined;
  }
}

export function parseForeachExpression(expression: string): {
  itemsExpression: string;
  valueName: string;
  keyName?: string;
} | null {
  const trimmed = expression.trim();
  const cached = foreachParseCache.get(trimmed);
  if (cached !== undefined) {
    return cached;
  }

  const parsed = parseForeachExpressionUncached(trimmed);
  foreachParseCache.set(trimmed, parsed);
  return parsed;
}

function parseForeachExpressionUncached(trimmed: string): {
  itemsExpression: string;
  valueName: string;
  keyName?: string;
} | null {
  const ofMatch = trimmed.match(/^(\w+)\s+of\s+(.+)$/);
  if (ofMatch) {
    return {
      valueName: ofMatch[1]!,
      itemsExpression: ofMatch[2]!.trim(),
    };
  }

  const asMatch = trimmed.match(/^(.+?)\s+as\s+(\w+)$/);
  if (asMatch) {
    return {
      itemsExpression: asMatch[1]!.trim(),
      valueName: asMatch[2]!,
    };
  }

  const keyedMatch = trimmed.match(/^(.+?)\s+as\s+(\w+)\s*=>\s*(\w+)$/);
  if (keyedMatch) {
    return {
      itemsExpression: keyedMatch[1]!.trim(),
      keyName: keyedMatch[2]!,
      valueName: keyedMatch[3]!,
    };
  }

  return null;
}