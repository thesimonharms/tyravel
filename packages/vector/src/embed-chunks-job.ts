import { Job } from '@pondoknusa/queue';
import { formatEmbeddingForStorage } from './embedding-format.js';
import { resolveEmbedModel } from './embed-model-registry.js';
import type { EmbedFn } from './types.js';

export interface EmbedChunksPayload extends Record<string, unknown> {
  model: string;
  ids: Array<number | string>;
  contentColumn?: string;
  embeddingColumn?: string;
}

let embedFn: EmbedFn | undefined;

export function setEmbedChunksHandler(handler: EmbedFn): void {
  embedFn = handler;
}

export class EmbedChunksJob extends Job<EmbedChunksPayload> {
  override async handle(): Promise<void> {
    if (!embedFn) {
      throw new Error(
        'EmbedChunksJob requires setEmbedChunksHandler() with an app-level embed function.',
      );
    }

    const model = resolveEmbedModel(this.data.model);
    if (!model) {
      throw new Error(
        `EmbedChunksJob model [${this.data.model}] is not registered. Call registerEmbedModel() in your app bootstrap.`,
      );
    }

    const contentColumn = this.data.contentColumn ?? 'content';
    const embeddingColumn = this.data.embeddingColumn ?? model.vectorColumn ?? 'embedding';
    const primaryKey = model.primaryKey;

    for (const id of this.data.ids) {
      const record = await model.find(id);
      if (!record || typeof record !== 'object') {
        continue;
      }

      const content = String(
        (record as { getAttribute?: (key: string) => unknown }).getAttribute?.(contentColumn) ?? '',
      );
      if (!content) {
        continue;
      }

      const embedding = await embedFn(content);
      await model
        .query()
        .where(primaryKey, id)
        .update({
          [embeddingColumn]: formatEmbeddingForStorage(embedding),
        });
    }
  }
}