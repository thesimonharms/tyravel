import type { ModelStatic } from '@pondoknusa/database';
import { similarTo, type EmbedFn } from '@pondoknusa/vector';
import { buildGroundedPrompt } from './prompt.js';
import { applyRerank } from './rerank.js';
import type { RagChunk, RagRetrieveOptions } from './types.js';

export interface RagOptions {
  model: ModelStatic;
  embed: EmbedFn;
  contentColumn?: string;
  sourceColumn?: string;
  metadataColumn?: string;
  embeddingColumn?: string;
}

export class Rag {
  private readonly contentColumn: string;
  private readonly sourceColumn: string;
  private readonly metadataColumn: string;
  private readonly embeddingColumn: string;

  constructor(private readonly options: RagOptions) {
    this.contentColumn = options.contentColumn ?? 'content';
    this.sourceColumn = options.sourceColumn ?? 'source';
    this.metadataColumn = options.metadataColumn ?? 'metadata';
    this.embeddingColumn = options.embeddingColumn ?? 'embedding';
  }

  async retrieve(query: string, options: RagRetrieveOptions = {}): Promise<RagChunk[]> {
    const embedding = await this.options.embed(query);
    const rows = await similarTo(this.options.model, embedding, {
      limit: options.topK ?? 5,
      threshold: options.minScore,
      column: this.embeddingColumn,
      metric: 'cosine',
      metadataColumn: options.metadataColumn ?? this.metadataColumn,
      metadataFilters: options.metadataFilters,
      hybrid: options.hybrid?.textQuery
        ? {
            textQuery: options.hybrid.textQuery ?? query,
            textColumn: options.hybrid.textColumn ?? this.contentColumn,
            vectorWeight: options.hybrid.vectorWeight,
          }
        : undefined,
    }).get();

    const chunks = rows.map((row) => ({
      content: String(row[this.contentColumn] ?? ''),
      score: Number(row.score ?? 0),
      source: row[this.sourceColumn] ? String(row[this.sourceColumn]) : undefined,
      metadata: parseMetadata(row[this.metadataColumn]),
    }));

    return applyRerank(query, chunks, options.rerank);
  }

  buildPrompt(question: string, chunks: RagChunk[], template?: string): string {
    return buildGroundedPrompt(question, chunks, template);
  }
}

function parseMetadata(value: unknown): Record<string, unknown> | undefined {
  if (!value) {
    return undefined;
  }
  if (typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }
  return undefined;
}