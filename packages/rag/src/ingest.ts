import type { ModelStatic } from '@pondoknusa/database';
import { chunkText } from '@pondoknusa/vector';
import type { IngestDocumentInput, IngestDocumentOptions } from './types.js';

export async function ingestDocument(
  model: ModelStatic,
  input: IngestDocumentInput,
  options: IngestDocumentOptions = {},
): Promise<Array<number | bigint | undefined>> {
  const contentColumn = options.contentColumn ?? 'content';
  const sourceColumn = options.sourceColumn ?? 'source';
  const metadataColumn = options.metadataColumn ?? 'metadata';
  const chunks = chunkText(input.content, {
    size: options.chunkSize,
    overlap: options.chunkOverlap,
  });

  const ids: Array<number | bigint | undefined> = [];
  for (const chunk of chunks) {
    const id = await model.query().insert({
      [contentColumn]: chunk,
      [sourceColumn]: input.source,
      [metadataColumn]: JSON.stringify({
        ...input.metadata,
        chunkIndex: ids.length,
      }),
    });
    ids.push(id);
  }

  return ids;
}