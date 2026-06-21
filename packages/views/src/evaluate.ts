import type { ViewExpressionBindings } from './view-registry.js';
import type { ViewContext } from './types.js';

export function mergeEvaluationContext(
  context: ViewContext,
  bindings?: ViewExpressionBindings,
): ViewContext {
  if (!bindings) {
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

  const keys = Object.keys(context);
  const values = Object.values(context);

  try {
    const evaluator = Function(...keys, `"use strict"; return (${trimmed});`);
    return evaluator(...values);
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