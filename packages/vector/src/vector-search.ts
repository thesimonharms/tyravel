import type { Model, ModelStatic } from '@pondoknusa/database';
import { searchVectors } from './search-driver.js';
import type { Embedding, VectorSearchOptions } from './types.js';

export class VectorSearch<TModel extends Model = Model> {
  constructor(
    private readonly model: ModelStatic,
    private readonly embedding: Embedding,
    private readonly options: VectorSearchOptions = {},
  ) {}

  static for<TModel extends Model>(
    model: ModelStatic,
    embedding: Embedding,
    options?: VectorSearchOptions,
  ): VectorSearch<TModel> {
    return new VectorSearch<TModel>(model, embedding, options);
  }

  async get(): Promise<Record<string, unknown>[]> {
    return searchVectors(this.model, this.embedding, this.options);
  }

  async getModels<T extends Model = TModel>(): Promise<T[]> {
    const rows = await this.get();
    const ctor = this.model as unknown as new (attributes?: Record<string, unknown>) => T;
    return rows.map((row) => new ctor(row));
  }
}

export function similarTo<TModel extends Model>(
  model: ModelStatic,
  embedding: Embedding,
  options?: VectorSearchOptions,
): VectorSearch<TModel> {
  return VectorSearch.for<TModel>(model, embedding, options);
}

export function scopeNearest<TModel extends Model>(
  model: ModelStatic,
  embedding: Embedding,
  options?: VectorSearchOptions,
): VectorSearch<TModel> {
  return similarTo<TModel>(model, embedding, options);
}

export function nearestOnBuilder<TModel extends Model>(
  builder: import('@pondoknusa/database').ModelQueryBuilder,
  embedding: Embedding,
  options: VectorSearchOptions = {},
): VectorSearch<TModel> {
  return similarTo<TModel>(builder.getModel(), embedding, {
    ...options,
    queryBuilder: builder.clone(),
  });
}