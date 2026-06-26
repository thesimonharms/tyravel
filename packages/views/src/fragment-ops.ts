import type { TemplateOp } from './types.js';

export class ViewFragmentNotFoundError extends Error {
  constructor(
    readonly viewName: string,
    readonly fragmentName: string,
  ) {
    super(`Fragment [${fragmentName}] was not found in view [${viewName}].`);
    this.name = 'ViewFragmentNotFoundError';
  }
}

export function findFragmentBody(
  ops: TemplateOp[],
  fragmentName: string,
): TemplateOp[] | undefined {
  for (const op of ops) {
    if (op.type === 'fragment' && op.name === fragmentName) {
      return op.body;
    }

    const nested = collectNestedOps(op);
    if (nested) {
      const body = findFragmentBody(nested, fragmentName);
      if (body) {
        return body;
      }
    }
  }

  return undefined;
}

function collectNestedOps(op: TemplateOp): TemplateOp[] | undefined {
  switch (op.type) {
    case 'if':
      return [...op.body, ...(op.elseBody ?? [])];
    case 'foreach':
    case 'section':
    case 'once':
    case 'push':
    case 'pushOnce':
    case 'prepend':
    case 'fragment':
    case 'stream':
    case 'island':
      return op.body;
    case 'forelse':
      return [...op.body, ...op.emptyBody];
    case 'switch':
      return [
        ...op.cases.flatMap((switchCase) => switchCase.body),
        ...(op.defaultBody ?? []),
      ];
    case 'component':
      return [
        ...(op.defaultSlot ?? []),
        ...Object.values(op.namedSlots ?? {}).flat(),
      ];
    default:
      return undefined;
  }
}