export interface ParsedViewName {
  namespace?: string;
  view: string;
}

export function parseViewName(name: string): ParsedViewName {
  const separator = name.indexOf('::');
  if (separator === -1) {
    return { view: name };
  }

  return {
    namespace: name.slice(0, separator),
    view: name.slice(separator + 2),
  };
}

export function normalizeNamespacedView(name: string): string {
  const parsed = parseViewName(name);
  if (!parsed.namespace) {
    return parsed.view;
  }

  return `${parsed.namespace}::${parsed.view}`;
}