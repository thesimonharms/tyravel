import type { Embedding } from '@pondoknusa/vector';

export interface QdrantVectorConfig {
  url: string;
  apiKey?: string;
  collectionPrefix?: string;
  fetch?: typeof fetch;
}

export interface QdrantSearchPoint {
  id: string | number;
  score: number;
  payload: Record<string, unknown>;
}

export async function searchQdrantCollection(
  config: QdrantVectorConfig,
  collection: string,
  embedding: Embedding,
  options: { limit?: number; threshold?: number } = {},
): Promise<QdrantSearchPoint[]> {
  const fetchImpl = config.fetch ?? fetch;
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (config.apiKey) {
    headers['api-key'] = config.apiKey;
  }

  const body: Record<string, unknown> = {
    vector: embedding,
    limit: options.limit ?? 10,
    with_payload: true,
  };
  if (options.threshold !== undefined) {
    body.score_threshold = options.threshold;
  }

  const response = await fetchImpl(
    `${trimTrailingSlash(config.url)}/collections/${encodeURIComponent(collection)}/points/search`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Qdrant search failed (${response.status}): ${text}`);
  }

  const payload = await response.json() as { result?: Array<{ id: string | number; score: number; payload?: Record<string, unknown> }> };
  return (payload.result ?? []).map((point) => ({
    id: point.id,
    score: point.score,
    payload: point.payload ?? {},
  }));
}

export function resolveQdrantCollection(
  modelTable: string,
  config: QdrantVectorConfig,
  override?: string,
): string {
  if (override) {
    return override;
  }

  const prefix = config.collectionPrefix ?? '';
  return `${prefix}${modelTable}`;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, '');
}