import type { QueryProfileEntry } from '@pondoknusa/database';
import { analyzeQueries } from './query-analysis.js';
import type { DebugRequestContext } from './context.js';
import { buildReplaySnippets } from './replay.js';
import type { RequestSnapshot } from './request-snapshot.js';
import type { DebugConfig, DebugRequestEntry } from './types.js';

export function buildDebugEntry(
  context: DebugRequestContext,
  status: number,
  durationMs: number,
  queries: QueryProfileEntry[],
  config: DebugConfig,
  requestSnapshot?: RequestSnapshot,
): DebugRequestEntry {
  const warnings = analyzeQueries(queries, {
    slowQueryMs: config.slowQueryMs,
    nPlusOneThreshold: config.nPlusOneThreshold,
  });

  const dispatched = context.timeline
    .filter((event) => event.type === 'queue' || event.type === 'event')
    .map((event) => ({
      type: event.type as 'queue' | 'event',
      label: event.label,
      queue: typeof event.metadata?.queue === 'string' ? event.metadata.queue : undefined,
      timestamp: event.timestamp,
      metadata: event.metadata,
    }));

  const entry: DebugRequestEntry = {
    id: context.id,
    method: context.method,
    path: context.path,
    status,
    durationMs,
    timestamp: Date.now(),
    timeline: [...context.timeline],
    queries,
    warnings,
  };

  if (requestSnapshot) {
    entry.request = requestSnapshot;
    entry.replay = buildReplaySnippets(requestSnapshot);
  }

  if (dispatched.length > 0) {
    entry.dispatched = dispatched;
  }

  return entry;
}