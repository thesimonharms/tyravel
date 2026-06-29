import type { VectorMetric } from '@pondoknusa/vector';

const METRIC_OPCLASS: Record<VectorMetric, string> = {
  cosine: 'vector_cosine_ops',
  l2: 'vector_l2_ops',
  inner_product: 'vector_ip_ops',
};

export function vectorIndexSql(
  table: string,
  column: string,
  metric: VectorMetric = 'cosine',
  indexName?: string,
): string {
  const opclass = METRIC_OPCLASS[metric];
  const resolvedIndex = indexName ?? `${table}_${column}_${metric}_idx`;
  return [
    `CREATE INDEX IF NOT EXISTS ${quoteIdentifier(resolvedIndex)}`,
    `ON ${quoteIdentifier(table)}`,
    `USING ivfflat (${quoteIdentifier(column)} ${opclass})`,
    'WITH (lists = 100)',
  ].join(' ');
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}