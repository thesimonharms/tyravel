import { describe, expect, it } from 'vitest';
import { Model } from '@pondoknusa/database';
import { QdrantVectorSearchDriver } from './qdrant-search-driver.js';

class Document extends Model {
  static override table = 'documents';
}

describe('QdrantVectorSearchDriver', () => {
  it('maps Qdrant payloads into ranked Pondoknusa rows', async () => {
    const fetchImpl = async () =>
      new Response(
        JSON.stringify({
          result: [
            {
              id: 1,
              score: 0.92,
              payload: {
                content: 'Native WebSockets',
                metadata: JSON.stringify({ visibility: 'public' }),
              },
            },
            {
              id: 2,
              score: 0.88,
              payload: {
                content: 'Private notes',
                metadata: JSON.stringify({ visibility: 'private' }),
              },
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );

    const driver = new QdrantVectorSearchDriver({
      url: 'http://127.0.0.1:6333',
      fetch: fetchImpl as typeof fetch,
    });

    const results = await driver.search(Document, [1, 0, 0], {
      limit: 5,
      metadataFilters: [{ key: 'visibility', value: 'public' }],
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.content).toBe('Native WebSockets');
  });
});