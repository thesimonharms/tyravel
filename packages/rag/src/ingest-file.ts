import type { ModelStatic } from '@pondoknusa/database';
import { ingestDocument } from './ingest.js';
import { loadDocument } from './load-document.js';
import type { IngestDocumentOptions } from './types.js';

export interface IngestFileOptions extends IngestDocumentOptions {
  source?: string;
  metadata?: Record<string, unknown>;
}

export async function ingestFile(
  model: ModelStatic,
  path: string,
  options: IngestFileOptions = {},
): Promise<Array<number | bigint | undefined>> {
  const loaded = await loadDocument(path);
  return ingestDocument(
    model,
    {
      source: options.source ?? loaded.source,
      content: loaded.content,
      metadata: {
        mime: loaded.mime,
        ...options.metadata,
      },
    },
    options,
  );
}