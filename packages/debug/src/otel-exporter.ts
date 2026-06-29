import { randomBytes } from 'node:crypto';
import type { DebugRequestEntry } from './types.js';

export interface OtelExportConfig {
  endpoint: string;
  serviceName?: string;
  headers?: Record<string, string>;
}

export async function exportDebugSpan(
  entry: DebugRequestEntry,
  config: OtelExportConfig,
): Promise<void> {
  const payload = buildOtlpPayload(entry, config.serviceName ?? 'pondoknusa');
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...config.headers,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`OTEL export failed with status ${response.status}`);
  }
}

function buildOtlpPayload(entry: DebugRequestEntry, serviceName: string): Record<string, unknown> {
  const startNs = BigInt(entry.timestamp) * 1_000_000n;
  const endNs = startNs + BigInt(Math.round(entry.durationMs * 1_000_000));

  return {
    resourceSpans: [
      {
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: serviceName } },
          ],
        },
        scopeSpans: [
          {
            scope: { name: '@pondoknusa/debug' },
            spans: [
              {
                traceId: randomId(16),
                spanId: randomId(8),
                name: `${entry.method} ${entry.path}`,
                kind: 2,
                startTimeUnixNano: startNs.toString(),
                endTimeUnixNano: endNs.toString(),
                attributes: [
                  { key: 'http.method', value: { stringValue: entry.method } },
                  { key: 'http.target', value: { stringValue: entry.path } },
                  { key: 'http.status_code', value: { intValue: entry.status } },
                  {
                    key: 'db.query.count',
                    value: { intValue: entry.queries.length },
                  },
                  {
                    key: 'debug.warning.count',
                    value: { intValue: entry.warnings.length },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

function randomId(bytes: number): string {
  return randomBytes(bytes).toString('hex');
}