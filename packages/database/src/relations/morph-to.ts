import { resolveMorphModel } from '../morph-map.js';
import type { Model } from '../model.js';
import type { ModelStatic } from '../model-types.js';
import type { RowValue } from '../types.js';
import { dedupeEagerKeys } from './eager-keys.js';
import { Relation } from './relation.js';

export class MorphToRelation<Related extends Model = Model> extends Relation<Related> {
  private readonly morphType: string;
  private readonly morphId: string;

  constructor(
    parent: Model,
    private readonly name: string,
    morphType?: string,
    morphId?: string,
    private readonly ownerKey?: string,
  ) {
    super(parent, parent.constructor as ModelStatic);
    this.morphType = morphType ?? `${name}_type`;
    this.morphId = morphId ?? `${name}_id`;
    this.setRelationName(name);
  }

  async get(): Promise<Related | null> {
    return this.resolveGet(async () => {
      const type = this.parent.getAttribute(this.morphType as never) as string | undefined;
      const id = this.parent.getAttribute(this.morphId as never) as RowValue;
      if (!type || id === undefined || id === null) {
        return null;
      }

      const relatedModel = resolveMorphModel(type);
      const key = this.ownerKey ?? relatedModel.primaryKey;
      return relatedModel.query().where(key, id).firstModel<Related>();
    });
  }

  override eagerLoadKeys(parents: Model[]): RowValue[] {
    return dedupeEagerKeys(
      parents.map((parent) => parent.getAttribute(this.morphId as never) as RowValue),
    );
  }

  override defaultEagerValue(): Related | null {
    return null;
  }

  override async eagerLoad(
    keys: RowValue[],
    parents: Model[] = [],
  ): Promise<Array<{ type: string; key: RowValue; model: Related }>> {
    const keySet = new Set(keys);
    const grouped = new Map<string, RowValue[]>();

    for (const parent of parents) {
      const id = parent.getAttribute(this.morphId as never) as RowValue;
      if (!keySet.has(id)) {
        continue;
      }

      const type = parent.getAttribute(this.morphType as never) as string;
      if (!type) {
        continue;
      }

      const bucket = grouped.get(type) ?? [];
      bucket.push(id);
      grouped.set(type, bucket);
    }

    const batches = await Promise.all(
      [...grouped.entries()].map(async ([type, ids]) => {
        const relatedModel = resolveMorphModel(type);
        const ownerKey = this.ownerKey ?? relatedModel.primaryKey;
        const uniqueIds = dedupeEagerKeys(ids);
        const models = await relatedModel
          .query()
          .whereIn(ownerKey, uniqueIds)
          .getModels<Related>();

        return models.map((model) => ({
          type,
          key: model.getAttribute(ownerKey as never) as RowValue,
          model,
        }));
      }),
    );

    return batches.flat();
  }

  override matchEager(
    parents: Model[],
    results: unknown,
    relationName: string,
  ): void {
    const entries = results as Array<{ type: string; key: RowValue; model: Related }>;
    const dictionary = new Map<string, Related>();

    for (const { type, key, model } of entries) {
      dictionary.set(`${type}:${key}`, model);
    }

    for (const parent of parents) {
      const type = parent.getAttribute(this.morphType as never) as string;
      const key = parent.getAttribute(this.morphId as never) as RowValue;
      parent.setRelation(
        relationName,
        type ? (dictionary.get(`${type}:${key}`) ?? null) : null,
      );
    }
  }
}