import type { ModelStatic } from '@pondoknusa/database';
import { finalizeVectorResults, type VectorSearchDriver } from '@pondoknusa/vector';
import type { Embedding, VectorSearchOptions } from '@pondoknusa/vector';
import {
  queryPineconeIndex,
  resolvePineconeIndex,
  type PineconeVectorConfig,
} from './pinecone-client.js';

export class PineconeVectorSearchDriver implements VectorSearchDriver {
  constructor(private readonly config: PineconeVectorConfig) {}

  async search(
    model: ModelStatic,
    embedding: Embedding,
    options: VectorSearchOptions = {},
  ): Promise<Record<string, unknown>[]> {
    const indexName = resolvePineconeIndex(
      model.table,
      this.config,
      options.externalCollection,
    );

    const matches = await queryPineconeIndex(this.config, indexName, embedding, {
      limit: options.limit ?? 10,
    });

    const rows = matches.map((match) => ({
      ...match.metadata,
      id: match.metadata.id ?? match.id,
      score: match.score,
      distance: Math.max(0, 1 - match.score),
    }));

    return finalizeVectorResults(rows, options);
  }
}