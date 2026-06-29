import type { Embedding } from '@pondoknusa/vector';

export interface PineconeVectorConfig {
  host: string;
  apiKey: string;
  namespace?: string;
  indexPrefix?: string;
  fetch?: typeof fetch;
}

export interface PineconeMatch {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

export async function queryPineconeIndex(
  config: PineconeVectorConfig,
  indexName: string,
  embedding: Embedding,
  options: { limit?: number } = {},
): Promise<PineconeMatch[]> {
  const fetchImpl = config.fetch ?? fetch;
  const response = await fetchImpl(`${trimTrailingSlash(config.host)}/query`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'Api-Key': config.apiKey,
      'X-Pinecone-API-Version': '2025-04',
    },
    body: JSON.stringify({
      vector: embedding,
      topK: options.limit ?? 10,
      includeMetadata: true,
      namespace: config.namespace,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pinecone query failed (${response.status}): ${text}`);
  }

  const payload = await response.json() as {
    matches?: Array<{ id: string; score: number; metadata?: Record<string, unknown> }>;
  };

  return (payload.matches ?? []).map((match) => ({
    id: match.id,
    score: match.score,
    metadata: match.metadata ?? {},
  }));
}

export function resolvePineconeIndex(
  modelTable: string,
  config: PineconeVectorConfig,
  override?: string,
): string {
  if (override) {
    return override;
  }

  const prefix = config.indexPrefix ?? '';
  return `${prefix}${modelTable}`;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, '');
}