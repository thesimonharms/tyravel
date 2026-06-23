import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compile } from './compiler.js';
import { discoverViewNamesSync } from './compiled-cache.js';
import type { TemplateOp, ViewConfig } from './types.js';
import { parseViewName } from './view-namespaces.js';

export interface ComponentCatalogEntry {
  name: string;
  path: string;
  props: Record<string, unknown>;
  slots: string[];
  aware: string[];
}

export function buildComponentCatalog(
  basePath: string,
  config: ViewConfig,
  namespaces: ReadonlyMap<string, string> = new Map(),
): ComponentCatalogEntry[] {
  const extension = config.extension ?? '.tyr';
  const viewsRoot = join(basePath, config.path);
  const entries: ComponentCatalogEntry[] = [];

  const componentRoots: Array<{ prefix: string; root: string }> = [
    { prefix: 'components', root: join(viewsRoot, 'components') },
  ];

  for (const [namespace, root] of namespaces.entries()) {
    componentRoots.push({
      prefix: `${namespace}::components`,
      root: join(root, 'components'),
    });
  }

  for (const { prefix, root } of componentRoots) {
    for (const relative of discoverViewNamesSync(root, extension)) {
      const name = `${prefix}.${relative}`;
      const path = join(root, `${relative.replace(/\./g, '/')}${extension}`);
      entries.push(inspectComponent(name, path));
    }
  }

  return entries.sort((left, right) => left.name.localeCompare(right.name));
}

export function inspectComponent(name: string, path: string): ComponentCatalogEntry {
  const source = readFileSync(path, 'utf8');
  const template = compile(source, { viewPath: path });

  return {
    name: normalizeCatalogName(name),
    path,
    props: template.props ?? {},
    slots: collectSlotNames(template.ops, template.defaultSlots),
    aware: template.aware ?? [],
  };
}

function normalizeCatalogName(name: string): string {
  const parsed = parseViewName(name);
  if (parsed.namespace) {
    return `${parsed.namespace}::${parsed.view.replace(/^components\./, '')}`;
  }
  return parsed.view.replace(/^components\./, '');
}

function collectSlotNames(
  ops: TemplateOp[],
  defaultSlots?: Record<string, TemplateOp[]>,
): string[] {
  const slots = new Set<string>(Object.keys(defaultSlots ?? {}));
  collectSlotsFromOps(ops, slots);
  return [...slots].sort();
}

function collectSlotsFromOps(ops: TemplateOp[], slots: Set<string>): void {
  for (const op of ops) {
    switch (op.type) {
      case 'component':
        if (op.namedSlots) {
          for (const slotName of Object.keys(op.namedSlots)) {
            slots.add(slotName);
          }
        }
        if (op.defaultSlot) {
          collectSlotsFromOps(op.defaultSlot, slots);
        }
        if (op.namedSlots) {
          for (const slotOps of Object.values(op.namedSlots)) {
            collectSlotsFromOps(slotOps, slots);
          }
        }
        break;
      case 'if':
        collectSlotsFromOps(op.body, slots);
        if (op.elseBody) {
          collectSlotsFromOps(op.elseBody, slots);
        }
        break;
      case 'foreach':
      case 'section':
      case 'once':
      case 'push':
      case 'pushOnce':
      case 'prepend':
      case 'fragment':
      case 'stream':
      case 'island':
        collectSlotsFromOps(op.body, slots);
        break;
      case 'forelse':
        collectSlotsFromOps(op.body, slots);
        collectSlotsFromOps(op.emptyBody, slots);
        break;
      case 'switch':
        for (const switchCase of op.cases) {
          collectSlotsFromOps(switchCase.body, slots);
        }
        if (op.defaultBody) {
          collectSlotsFromOps(op.defaultBody, slots);
        }
        break;
      default:
        break;
    }
  }
}