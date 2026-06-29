import { describe, expect, it } from 'vitest';
import { Model } from '@pondoknusa/database';
import { PineconeVectorSearchDriver } from './pinecone-search-driver.js';

class Document extends Model {
  static override table = 'documents';
}

describe('PineconeVectorSearchDriver', () => {
  it('maps Pinecone metadata into ranked Pondoknusa rows', async () => {
    const fetchImpl = async () =>
      new Response(
        JSON.stringify({
          matches: [
            {
              id: 'doc-1',
              score: 0.95,
              metadata: {
                content: 'Vector search with Pinecone',
                metadata: JSON.stringify({ topic: 'rag' }),
              },
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );

    const driver = new PineconeVectorSearchDriver({
      host: 'https://example.svc.pinecone.io',
      apiKey: 'test-key',
      fetch: fetchImpl as typeof fetch,
    });

    const results = await driver.search(Document, [0.2, 0.8], { limit: 3 });
    expect(results[0]?.content).toBe('Vector search with Pinecone');
    expect(results[0]?.score).toBe(0.95);
  });
});