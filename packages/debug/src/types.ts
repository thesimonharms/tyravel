import type { QueryProfileEntry } from '@pondoknusa/database';

export type DebugTimelineType =
  | 'http'
  | 'query'
  | 'cache'
  | 'queue'
  | 'event'
  | 'mail'
  | 'notification'
  | 'broadcast';

export interface DebugTimelineEvent {
  type: DebugTimelineType;
  label: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export interface DebugWarning {
  type: 'slow_query' | 'n_plus_one';
  message: string;
  metadata?: Record<string, unknown>;
}

export interface DebugReplaySnippets {
  curl: string;
  fetch: string;
}

export interface DebugRequestSnapshot {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export interface DebugDispatchedWork {
  type: 'queue' | 'event';
  label: string;
  queue?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface DebugJobExecution {
  id: string;
  parentRequestId: string;
  job: string;
  queue: string;
  status: 'completed' | 'failed';
  durationMs: number;
  timestamp: number;
}

export interface DebugRequestEntry {
  id: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  timestamp: number;
  timeline: DebugTimelineEvent[];
  queries: QueryProfileEntry[];
  warnings: DebugWarning[];
  dispatched?: DebugDispatchedWork[];
  executions?: DebugJobExecution[];
  request?: DebugRequestSnapshot;
  replay?: DebugReplaySnippets;
}

export interface DebugOtelConfig {
  enabled?: boolean;
  endpoint?: string;
  serviceName?: string;
  headers?: Record<string, string>;
}

export interface DebugConfig {
  enabled?: boolean;
  path?: string;
  injectBar?: boolean;
  maxEntries?: number;
  persist?: boolean;
  persistPath?: string;
  correlationsPath?: string;
  slowQueryMs?: number;
  nPlusOneThreshold?: number;
  otel?: DebugOtelConfig;
}