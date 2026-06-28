import type { Model } from '../model.js';
import type { ModelStatic } from '../model-types.js';
import type { ModelQueryBuilder } from '../model-query-builder.js';
import type { RowValue } from '../types.js';
import { dedupeEagerKeys } from './eager-keys.js';
import { Relation } from './relation.js';

export class HasOneRelation<Related extends Model = Model> extends Relation<Related> {
  constructor(
    parent: Model,
    relatedModel: ModelStatic,
    private readonly foreignKey: string,
    private readonly localKey: string,
  ) {
    super(parent, relatedModel);
  }

  query(): ModelQueryBuilder {
    const localValue = this.parent.getAttribute(this.localKey as never) as RowValue;
    return this.relatedModel.query().where(this.foreignKey, localValue);
  }

  async get(): Promise<Related | null> {
    return this.resolveGet(async () => this.query().firstModel<Related>());
  }

  override eagerLoadKeys(parents: Model[]): RowValue[] {
    return dedupeEagerKeys(
      parents.map((parent) => parent.getAttribute(this.localKey as never) as RowValue),
    );
  }

  override defaultEagerValue(): null {
    return null;
  }

  override async eagerLoad(keys: RowValue[]): Promise<Related[]> {
    return this.relatedModel
      .query()
      .whereIn(this.foreignKey, keys)
      .getModels<Related>();
  }

  override matchEager(
    parents: Model[],
    results: unknown,
    relationName: string,
  ): void {
    const related = results as Related[];
    const dictionary = new Map<RowValue, Related>();

    for (const model of related) {
      const key = model.getAttribute(this.foreignKey as never) as RowValue;
      if (!dictionary.has(key)) {
        dictionary.set(key, model);
      }
    }

    for (const parent of parents) {
      const key = parent.getAttribute(this.localKey as never) as RowValue;
      parent.setRelation(relationName, dictionary.get(key) ?? null);
    }
  }
}