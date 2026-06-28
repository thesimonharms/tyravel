import type { RouteParams } from './types.js';

export type RouteSegment =
  | { kind: 'literal'; value: string }
  | { kind: 'param'; name: string };

export interface TrieRouteMatch<TRoute> {
  route: TRoute;
  params: RouteParams;
}

interface TrieNode<TRoute> {
  literal: Map<string, TrieNode<TRoute>>;
  param: TrieNode<TRoute> | null;
  paramName: string | null;
  routes: TRoute[];
}

function createNode<TRoute>(): TrieNode<TRoute> {
  return {
    literal: new Map(),
    param: null,
    paramName: null,
    routes: [],
  };
}

export function parseRouteSegments(pattern: string): RouteSegment[] {
  const normalized = pattern.replace(/\/+$/, '');
  if (!normalized || normalized === '/') {
    return [];
  }

  return normalized.split('/').filter(Boolean).map((part) => {
    const paramMatch = part.match(/^:([A-Za-z0-9_]+)$/);
    if (paramMatch) {
      return { kind: 'param' as const, name: paramMatch[1]! };
    }

    return { kind: 'literal' as const, value: part };
  });
}

export function splitPathname(pathname: string): string[] {
  if (pathname === '/' || pathname === '') {
    return [];
  }

  return pathname.split('/').filter(Boolean);
}

/**
 * Segment trie for dynamic routes. Walks path segments in O(depth) and returns
 * candidate matches in registration order (first match wins at dispatch time).
 */
export class RoutePrefixTrie<TRoute> {
  private readonly root = createNode<TRoute>();

  add(route: TRoute, segments: RouteSegment[]): void {
    let node = this.root;

    for (const segment of segments) {
      if (segment.kind === 'literal') {
        let next = node.literal.get(segment.value);
        if (!next) {
          next = createNode<TRoute>();
          node.literal.set(segment.value, next);
        }
        node = next;
        continue;
      }

      if (!node.param) {
        node.param = createNode<TRoute>();
        node.param.paramName = segment.name;
      }

      node = node.param;
    }

    node.routes.push(route);
  }

  match(pathname: string): TrieRouteMatch<TRoute>[] {
    const segments = splitPathname(pathname);
    const matches: TrieRouteMatch<TRoute>[] = [];
    this.walk(this.root, segments, 0, {}, matches);
    return matches;
  }

  private walk(
    node: TrieNode<TRoute>,
    pathSegments: string[],
    pathIndex: number,
    params: RouteParams,
    matches: TrieRouteMatch<TRoute>[],
  ): void {
    if (pathIndex === pathSegments.length) {
      for (const route of node.routes) {
        matches.push({ route, params });
      }
      return;
    }

    const segment = pathSegments[pathIndex]!;

    const literalChild = node.literal.get(segment);
    if (literalChild) {
      this.walk(literalChild, pathSegments, pathIndex + 1, params, matches);
    }

    if (node.param) {
      const paramName = node.param.paramName;
      if (paramName) {
        this.walk(
          node.param,
          pathSegments,
          pathIndex + 1,
          { ...params, [paramName]: decodeURIComponent(segment) },
          matches,
        );
      }
    }
  }
}