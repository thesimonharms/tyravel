import { resolveMorphAlias } from '../morph-map.js';
import type { Model } from '../model.js';
import type { ModelStatic } from '../model-types.js';
import type { ModelQueryBuilder } from '../model-query-builder.js';
import type { RowValue } from '../types.js';
import { Relation } from './relation.js';

export class MorphManyRelation<Related extends Model = Model> extends Relation<Related> {
  private readonly morphType: string;
  private readonly morphId: string;

  constructor(
    parent: Model,
    relatedModel: ModelStatic,
    private readonly name: string,
    morphType?: string,
    morphId?: string,
    private readonly localKey?: string,
  ) {
    super(parent, relatedModel);
    this.morphType = morphType ?? `${name}_type`;
    this.morphId = morphId ?? `${name}_id`;
  }

  query(): ModelQueryBuilder {
    const parentModel = this.parent.constructor as ModelStatic;
    const parentKey = this.localKey ?? parentModel.primaryKey;
    const parentId = this.parent.getAttribute(parentKey as never) as RowValue;

    return this.relatedModel
      .query()
      .where(this.morphType, resolveMorphAlias(parentModel))
      .where(this.morphId, parentId);
  }

  async get(): Promise<Related[]> {
    return this.query().getModels<Related>();
  }

  override eagerLoadKeys(parents: Model[]): RowValue[] {
    const parentModel = this.parent.constructor as ModelStatic;
    const parentKey = this.localKey ?? parentModel.primaryKey;
    return parents
      .map((parent) => parent.getAttribute(parentKey as never) as RowValue)
      .filter((key) => key !== undefined && key !== null);
  }

  override defaultEagerValue(): Related[] {
    return [];
  }

  override async eagerLoad(keys: RowValue[]): Promise<Related[]> {
    const parentModel = this.parent.constructor as ModelStatic;
    return this.relatedModel
      .query()
      .where(this.morphType, resolveMorphAlias(parentModel))
      .whereIn(this.morphId, keys)
      .getModels<Related>();
  }

  override matchEager(
    parents: Model[],
    results: unknown,
    relationName: string,
  ): void {
    const parentModel = this.parent.constructor as ModelStatic;
    const parentKey = this.localKey ?? parentModel.primaryKey;
    const related = results as Related[];
    const dictionary = new Map<RowValue, Related[]>();

    for (const model of related) {
      const key = model.getAttribute(this.morphId as never) as RowValue;
      const bucket = dictionary.get(key);
      if (bucket) {
        bucket.push(model);
      } else {
        dictionary.set(key, [model]);
      }
    }

    for (const parent of parents) {
      const key = parent.getAttribute(parentKey as never) as RowValue;
      parent.setRelation(relationName, dictionary.get(key) ?? []);
    }
  }
}