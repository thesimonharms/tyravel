export type VectorMetric = 'cosine' | 'l2' | 'inner_product';

export type Embedding = number[];

import type { ModelQueryBuilder } from '@pondoknusa/database';
import type { MetadataFilter } from './metadata-filters.js';

export interface HybridSearchOptions {
  textQuery: string;
  textColumn?: string;
  vectorWeight?: number;
}

export interface VectorSearchOptions {
  limit?: number;
  threshold?: number;
  column?: string;
  metric?: VectorMetric;
  queryBuilder?: ModelQueryBuilder;
  filteredRows?: Record<string, unknown>[];
  hybrid?: HybridSearchOptions;
  metadataFilters?: MetadataFilter[];
  metadataColumn?: string;
  externalCollection?: string;
}

export interface VectorRecord {
  id?: number | string;
  embedding: Embedding;
  metadata?: Record<string, unknown>;
  content?: string;
  distance?: number;
  score?: number;
}

export type EmbedFn = (text: string) => Promise<Embedding>;