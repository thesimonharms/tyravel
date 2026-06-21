import type { CompiledTemplate, TemplateOp } from './types.js';

export interface StreamSection {
  name: string;
  body: TemplateOp[];
}

export function collectStreamSections(template: CompiledTemplate): StreamSection[] {
  return collectFromOps(template.ops);
}

export function streamPlaceholder(name: string): string {
  return `<!--tyr-stream:${name}-->`;
}

function collectFromOps(ops: TemplateOp[]): StreamSection[] {
  const sections: StreamSection[] = [];

  for (const op of ops) {
    switch (op.type) {
      case 'stream':
        sections.push({ name: op.name, body: op.body });
        break;
      case 'if':
        sections.push(...collectFromOps(op.body));
        if (op.elseBody) {
          sections.push(...collectFromOps(op.elseBody));
        }
        break;
      case 'foreach':
      case 'section':
      case 'once':
      case 'push':
      case 'pushOnce':
      case 'prepend':
      case 'fragment':
      case 'island':
        sections.push(...collectFromOps(op.body));
        break;
      case 'forelse':
        sections.push(...collectFromOps(op.body));
        sections.push(...collectFromOps(op.emptyBody));
        break;
      case 'switch':
        for (const switchCase of op.cases) {
          sections.push(...collectFromOps(switchCase.body));
        }
        if (op.defaultBody) {
          sections.push(...collectFromOps(op.defaultBody));
        }
        break;
      case 'component':
        if (op.defaultSlot) {
          sections.push(...collectFromOps(op.defaultSlot));
        }
        if (op.namedSlots) {
          for (const slotOps of Object.values(op.namedSlots)) {
            sections.push(...collectFromOps(slotOps));
          }
        }
        break;
      default:
        break;
    }
  }

  return sections;
}