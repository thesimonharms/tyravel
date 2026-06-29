export interface RagChunk {
  content: string;
  score: number;
  source?: string;
  metadata?: Record<string, unknown>;
}

import type { MetadataFilter } from '@pondoknusa/vector';

export type RerankFn = (query: string, chunks: RagChunk[]) => Promise<RagChunk[]>;

export interface RagRetrieveOptions {
  topK?: number;
  minScore?: number;
  rerank?: RerankFn;
  hybrid?: {
    textQuery?: string;
    textColumn?: string;
    vectorWeight?: number;
  };
  metadataFilters?: MetadataFilter[];
  metadataColumn?: string;
}

export interface IngestDocumentInput {
  source: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface IngestDocumentOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  contentColumn?: string;
  sourceColumn?: string;
  metadataColumn?: string;
}