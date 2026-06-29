import type { QueryProfileEntry } from '@pondoknusa/database';
import type { DebugWarning } from './types.js';

export function analyzeQueries(
  queries: QueryProfileEntry[],
  options: { slowQueryMs?: number; nPlusOneThreshold?: number } = {},
): DebugWarning[] {
  const warnings: DebugWarning[] = [];
  const slowQueryMs = options.slowQueryMs ?? 100;
  const nPlusOneThreshold = options.nPlusOneThreshold ?? 3;

  for (const query of queries) {
    if (query.durationMs >= slowQueryMs) {
      const sourceSuffix = query.source ? ` at ${formatSource(query.source)}` : '';
      warnings.push({
        type: 'slow_query',
        message: `Slow query (${query.durationMs.toFixed(1)}ms)${sourceSuffix}: ${truncate(query.sql, 120)}`,
        metadata: {
          durationMs: query.durationMs,
          sql: query.sql,
          source: query.source,
        },
      });
    }
  }

  const templates = new Map<string, number>();
  const templateSources = new Map<string, string | undefined>();
  for (const query of queries) {
    const template = normalizeSql(query.sql);
    templates.set(template, (templates.get(template) ?? 0) + 1);
    if (!templateSources.has(template)) {
      templateSources.set(template, query.source);
    }
  }

  for (const [template, count] of templates) {
    if (count >= nPlusOneThreshold) {
      const source = templateSources.get(template);
      const sourceSuffix = source ? ` at ${formatSource(source)}` : '';
      warnings.push({
        type: 'n_plus_one',
        message: `Possible N+1 (${count}×)${sourceSuffix}: ${truncate(template, 120)}`,
        metadata: {
          count,
          template,
          source,
        },
      });
    }
  }

  return warnings;
}

function normalizeSql(sql: string): string {
  return sql
    .replace(/\b\d+\b/g, '?')
    .replace(/'(?:''|[^'])*'/g, '?')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function formatSource(stackLine: string): string {
  const match = stackLine.match(/\((.+):(\d+):(\d+)\)/) ?? stackLine.match(/at (.+):(\d+):(\d+)/);
  if (!match) {
    return stackLine;
  }

  const file = match[1]?.replace(/^file:\/\//, '') ?? stackLine;
  const line = match[2];
  const shortFile = file.includes('/') ? file.split('/').slice(-2).join('/') : file;
  return `${shortFile}:${line}`;
}