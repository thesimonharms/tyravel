import type { ModelStatic } from '@pondoknusa/database';
import { MemoryVectorSearchDriver } from './memory-search-driver.js';
import type { VectorSearchDriver } from './search-driver.js';
import type { Embedding, VectorSearchOptions } from './types.js';

/**
 * Local vector search for SQLite dev/test setups.
 * Embeddings are stored as JSON text columns and ranked in-process.
 */
export class SqliteVectorSearchDriver implements VectorSearchDriver {
  private readonly memory = new MemoryVectorSearchDriver();

  async search(
    model: ModelStatic,
    embedding: Embedding,
    options: VectorSearchOptions = {},
  ): Promise<Record<string, unknown>[]> {
    const connection = model.getConnection();
    if (connection.grammar.driver !== 'sqlite') {
      throw new Error(
        `SqliteVectorSearchDriver requires a sqlite connection (got ${connection.grammar.driver}).`,
      );
    }

    return this.memory.search(model, embedding, options);
  }
}