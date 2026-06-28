import { parseQuotedStrings } from './directive-parsers.js';
import type { CompiledTemplate, SwitchCase, TemplateOp } from './types.js';

export interface ConditionalFoldOptions {
  environment?: string;
}

type StaticTruth = boolean | undefined;

function splitTopLevel(expression: string, operator: '&&' | '||'): string[] | null {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < expression.length; index++) {
    const char = expression[index];
    if (char === '(') {
      depth++;
      continue;
    }
    if (char === ')') {
      depth--;
      continue;
    }
    if (depth === 0 && expression.startsWith(operator, index)) {
      parts.push(expression.slice(start, index).trim());
      start = index + operator.length;
      index += operator.length - 1;
    }
  }

  if (parts.length === 0) {
    return null;
  }

  parts.push(expression.slice(start).trim());
  return parts;
}

function evaluateStaticLiteral(expression: string): unknown | undefined {
  const trimmed = expression.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed === 'true') {
    return true;
  }
  if (trimmed === 'false') {
    return false;
  }
  if (trimmed === 'null') {
    return null;
  }
  if (trimmed === 'undefined') {
    return undefined;
  }

  const quoted = trimmed.match(/^(['"])(.*)\1$/s);
  if (quoted) {
    return quoted[2]!
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\(['"\\])/g, '$1');
  }

  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  if (trimmed === '[]') {
    return [];
  }
  if (trimmed === '{}') {
    return {};
  }

  return undefined;
}

function isStaticallyEmpty(value: unknown): boolean {
  if (value == null) {
    return true;
  }
  if (value === '') {
    return true;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).length === 0;
  }
  return false;
}

export function evaluateStaticBoolean(expression: string): StaticTruth {
  const trimmed = expression.trim();
  if (!trimmed) {
    return undefined;
  }

  const literal = evaluateStaticLiteral(trimmed);
  if (literal !== undefined) {
    if (typeof literal === 'number') {
      return literal !== 0;
    }
    if (typeof literal === 'string') {
      return literal.length > 0;
    }
    if (Array.isArray(literal)) {
      return literal.length > 0;
    }
    if (typeof literal === 'object' && literal !== null) {
      return Object.keys(literal).length > 0;
    }
    return Boolean(literal);
  }

  const negated = trimmed.match(/^!\s*(.+)$/);
  if (negated) {
    const inner = evaluateStaticBoolean(negated[1]!);
    return inner === undefined ? undefined : !inner;
  }

  const doubleNegated = trimmed.match(/^!!\s*(.+)$/);
  if (doubleNegated) {
    const inner = evaluateStaticBoolean(doubleNegated[1]!);
    return inner === undefined ? undefined : Boolean(inner);
  }

  const strictEquals = trimmed.match(/^(.+?)\s*===\s*(.+)$/);
  if (strictEquals) {
    const left = evaluateStaticLiteral(strictEquals[1]!);
    const right = evaluateStaticLiteral(strictEquals[2]!);
    if (left === undefined && strictEquals[1]!.trim() !== 'undefined') {
      return undefined;
    }
    if (right === undefined && strictEquals[2]!.trim() !== 'undefined') {
      return undefined;
    }
    return left === right;
  }

  const andParts = splitTopLevel(trimmed, '&&');
  if (andParts && andParts.length > 1) {
    for (const part of andParts) {
      const value = evaluateStaticBoolean(part);
      if (value === undefined) {
        return undefined;
      }
      if (!value) {
        return false;
      }
    }
    return true;
  }

  const orParts = splitTopLevel(trimmed, '||');
  if (orParts && orParts.length > 1) {
    for (const part of orParts) {
      const value = evaluateStaticBoolean(part);
      if (value === undefined) {
        return undefined;
      }
      if (value) {
        return true;
      }
    }
    return false;
  }

  return undefined;
}

function resolveConditionalTruth(
  op: Extract<TemplateOp, { type: 'if' }>,
  options: ConditionalFoldOptions,
): StaticTruth {
  const mode = op.mode ?? 'if';

  switch (mode) {
    case 'production':
      if (!options.environment) {
        return undefined;
      }
      return options.environment === 'production';
    case 'local':
      if (!options.environment) {
        return undefined;
      }
      return options.environment === 'local' || options.environment === 'development';
    case 'env': {
      if (!options.environment) {
        return undefined;
      }
      const allowed = parseQuotedStrings(op.expression);
      return allowed.includes(options.environment);
    }
    case 'unless': {
      const value = evaluateStaticBoolean(op.expression);
      return value === undefined ? undefined : !value;
    }
    case 'empty': {
      const literal = evaluateStaticLiteral(op.expression);
      if (literal !== undefined) {
        return isStaticallyEmpty(literal);
      }
      return undefined;
    }
    case 'auth':
    case 'guest':
    case 'can':
    case 'error':
    case 'isset':
      return undefined;
    default:
      return evaluateStaticBoolean(op.expression);
  }
}

function foldNestedOp(op: TemplateOp, options: ConditionalFoldOptions): TemplateOp {
  switch (op.type) {
    case 'foreach':
    case 'section':
    case 'once':
    case 'push':
    case 'pushOnce':
    case 'prepend':
    case 'fragment':
    case 'stream':
    case 'island':
      return { ...op, body: foldTemplateOps(op.body, options) };
    case 'forelse':
      return {
        ...op,
        body: foldTemplateOps(op.body, options),
        emptyBody: foldTemplateOps(op.emptyBody, options),
      };
    case 'switch':
      return {
        ...op,
        cases: op.cases.map((switchCase) => foldSwitchCase(switchCase, options)),
        defaultBody: op.defaultBody ? foldTemplateOps(op.defaultBody, options) : undefined,
      };
    case 'component':
      return {
        ...op,
        defaultSlot: op.defaultSlot ? foldTemplateOps(op.defaultSlot, options) : undefined,
        namedSlots: op.namedSlots
          ? Object.fromEntries(
              Object.entries(op.namedSlots).map(([name, body]) => [
                name,
                foldTemplateOps(body, options),
              ]),
            )
          : undefined,
      };
    default:
      return op;
  }
}

function foldSwitchCase(switchCase: SwitchCase, options: ConditionalFoldOptions): SwitchCase {
  return {
    ...switchCase,
    body: foldTemplateOps(switchCase.body, options),
  };
}

export function foldTemplateOps(
  ops: TemplateOp[],
  options: ConditionalFoldOptions = {},
): TemplateOp[] {
  const folded: TemplateOp[] = [];

  for (const op of ops) {
    if (op.type !== 'if') {
      folded.push(foldNestedOp(op, options));
      continue;
    }

    const truth = resolveConditionalTruth(op, options);
    const foldedBody = foldTemplateOps(op.body, options);
    const foldedElse = op.elseBody ? foldTemplateOps(op.elseBody, options) : undefined;

    if (truth === true) {
      folded.push(...foldedBody);
      continue;
    }

    if (truth === false) {
      if (foldedElse) {
        folded.push(...foldedElse);
      }
      continue;
    }

    folded.push({
      ...op,
      body: foldedBody,
      elseBody: foldedElse,
    });
  }

  return folded;
}

export function foldCompiledTemplate(
  template: CompiledTemplate,
  options: ConditionalFoldOptions = {},
): CompiledTemplate {
  return {
    ...template,
    ops: foldTemplateOps(template.ops, options),
    defaultSlots: template.defaultSlots
      ? Object.fromEntries(
          Object.entries(template.defaultSlots).map(([name, body]) => [
            name,
            foldTemplateOps(body, options),
          ]),
        )
      : undefined,
  };
}