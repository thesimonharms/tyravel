import { getDebugContext } from './context.js';

export const DEBUG_REQUEST_ID_KEY = '_pondoknusaDebugRequestId';

export function getCurrentDebugRequestId(): string | undefined {
  return getDebugContext()?.id;
}

export function stampJobData(data: Record<string, unknown>): void {
  const requestId = getCurrentDebugRequestId();
  if (requestId) {
    data[DEBUG_REQUEST_ID_KEY] = requestId;
  }
}

export function stampJob(job: { data: Record<string, unknown> }): void {
  stampJobData(job.data);
}

export function extractDebugRequestId(data: Record<string, unknown>): string | undefined {
  const value = data[DEBUG_REQUEST_ID_KEY];
  return typeof value === 'string' ? value : undefined;
}