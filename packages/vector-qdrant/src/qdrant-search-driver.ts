import type { ModelStatic } from '@pondoknusa/database';
import { finalizeVectorResults, type VectorSearchDriver } from '@pondoknusa/vector';
import type { Embedding, VectorSearchOptions } from '@pondoknusa/vector';
import {
  resolveQdrantCollection,
  searchQdrantCollection,
  type QdrantVectorConfig,
} from './qdrant-client.js';

export class QdrantVectorSearchDriver implements VectorSearchDriver {
  constructor(private readonly config: QdrantVectorConfig) {}

  async search(
    model: ModelStatic,
    embedding: Embedding,
    options: VectorSearchOptions = {},
  ): Promise<Record<string, unknown>[]> {
    const collection = resolveQdrantCollection(
      model.table,
      this.config,
      options.externalCollection,
    );

    const points = await searchQdrantCollection(this.config, collection, embedding, {
      limit: options.limit ?? 10,
      threshold: options.threshold,
    });

    const rows = points.map((point) => ({
      ...point.payload,
      id: point.payload.id ?? point.id,
      score: point.score,
      distance: Math.max(0, 1 - point.score),
    }));

    return finalizeVectorResults(rows, options);
  }
}