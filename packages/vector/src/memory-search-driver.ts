import type { ModelStatic } from '@pondoknusa/database';
import { distanceToScore, vectorDistance } from './distance.js';
import { blendHybridScore, textMatchScore } from './hybrid-search.js';
import { matchesMetadataFilters, parseMetadataColumn } from './metadata-filters.js';
import type { VectorSearchDriver } from './search-driver.js';
import type { Embedding, VectorSearchOptions } from './types.js';

function parseEmbedding(value: unknown): Embedding | null {
  if (Array.isArray(value)) {
    return value.map((entry) => Number(entry));
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.map((entry) => Number(entry)) : null;
    } catch {
      return null;
    }
  }
  return null;
}

export class MemoryVectorSearchDriver implements VectorSearchDriver {
  async search(
    model: ModelStatic,
    embedding: Embedding,
    options: VectorSearchOptions = {},
  ): Promise<Record<string, unknown>[]> {
    const column = options.column ?? model.vectorColumn ?? 'embedding';
    const metric = options.metric ?? 'cosine';
    const limit = options.limit ?? 10;
    const threshold = options.threshold;
    const metadataColumn = options.metadataColumn ?? 'metadata';
    const metadataFilters = options.metadataFilters ?? [];
    const hybrid = options.hybrid;

    const rows = options.filteredRows
      ?? (options.queryBuilder
        ? await options.queryBuilder.get()
        : await model.query().get());
    const ranked: Record<string, unknown>[] = [];

    for (const row of rows) {
      const metadata = parseMetadataColumn(row[metadataColumn]);
      if (!matchesMetadataFilters(metadata, metadataFilters)) {
        continue;
      }

      const stored = parseEmbedding(row[column]);
      if (!stored) {
        continue;
      }
      const distance = vectorDistance(embedding, stored, metric);
      let score = distanceToScore(distance, metric);

      if (hybrid) {
        const textColumn = hybrid.textColumn ?? 'content';
        const textScore = textMatchScore(row[textColumn], hybrid.textQuery);
        score = blendHybridScore(score, textScore, hybrid.vectorWeight ?? 0.6);
      }

      if (threshold !== undefined && score < threshold) {
        continue;
      }
      ranked.push({ ...row, distance, score, textScore: hybrid ? textMatchScore(row[hybrid.textColumn ?? 'content'], hybrid.textQuery) : undefined });
    }

    return ranked
      .sort((left, right) => Number(left.distance ?? 0) - Number(right.distance ?? 0))
      .slice(0, limit);
  }
}