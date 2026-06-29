import { Model, ModelQueryBuilder } from '@pondoknusa/database';
import type { ModelStatic } from '@pondoknusa/database';
import { scopeNearest, similarTo, type VectorSearch } from './vector-search.js';
import type { Embedding, VectorSearchOptions } from './types.js';

type ModelConstructor = typeof Model & {
  similarTo<TModel extends Model>(
    this: new (attributes?: Record<string, unknown>) => TModel,
    embedding: Embedding,
    options?: VectorSearchOptions,
  ): VectorSearch<TModel>;
};

type ModelQueryBuilderWithNearest = ModelQueryBuilder & {
  scopeNearest<TModel extends Model>(
    embedding: Embedding,
    options?: VectorSearchOptions,
  ): VectorSearch<TModel>;
};

let registered = false;

export function registerModelVectorSearch(): void {
  if (registered) {
    return;
  }
  registered = true;

  const modelClass = Model as ModelConstructor;
  modelClass.similarTo = function similarToStatic<TModel extends Model>(
    this: new (attributes?: Record<string, unknown>) => TModel,
    embedding: Embedding,
    options?: VectorSearchOptions,
  ) {
    return similarTo<TModel>(this as unknown as ModelStatic, embedding, options);
  };

  const prototype = ModelQueryBuilder.prototype as ModelQueryBuilderWithNearest;
  prototype.scopeNearest = function scopeNearestOnBuilder<TModel extends Model>(
    embedding: Embedding,
    options: VectorSearchOptions = {},
  ) {
    const model = this.getModel();
    return similarTo<TModel>(model, embedding, {
      ...options,
      queryBuilder: this.clone(),
    });
  };
}

registerModelVectorSearch();