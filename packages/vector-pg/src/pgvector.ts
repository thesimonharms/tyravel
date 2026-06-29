import type { Embedding, VectorMetric } from '@pondoknusa/vector';

const METRIC_OPERATORS: Record<VectorMetric, string> = {
  cosine: '<=>',
  l2: '<->',
  inner_product: '<#>',
};

export function formatPgVector(embedding: Embedding): string {
  return `[${embedding.join(',')}]`;
}

export function pgVectorOperator(metric: VectorMetric = 'cosine'): string {
  return METRIC_OPERATORS[metric];
}

export async function ensurePgVectorExtension(connection: {
  exec(sql: string): Promise<void>;
}): Promise<void> {
  await connection.exec('CREATE EXTENSION IF NOT EXISTS vector');
}