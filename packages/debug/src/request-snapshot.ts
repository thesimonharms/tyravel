import type { PondoknusaRequest } from '@pondoknusa/http';

const REDACTED_HEADERS = new Set(['authorization', 'cookie', 'set-cookie', 'x-csrf-token']);

export interface RequestSnapshot {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export async function captureRequestSnapshot(
  request: PondoknusaRequest,
): Promise<RequestSnapshot> {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = REDACTED_HEADERS.has(key.toLowerCase()) ? '[REDACTED]' : value;
  });

  let body: string | undefined;
  if (!['GET', 'HEAD'].includes(request.method)) {
    try {
      const rawBody = await request.raw.clone().text();
      body = rawBody.length > 4096 ? `${rawBody.slice(0, 4096)}…` : rawBody;
    } catch {
      body = undefined;
    }
  }

  return {
    method: request.method,
    url: request.url.toString(),
    headers,
    body,
  };
}