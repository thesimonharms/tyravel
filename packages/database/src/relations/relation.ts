import type { Model } from '../model.js';
import type { ModelStatic } from '../model-types.js';
import type { RowValue } from '../types.js';

export abstract class Relation<Related extends Model = Model> {
  constructor(
    protected readonly parent: Model,
    protected readonly relatedModel: ModelStatic,
  ) {}

  abstract get(): Promise<Related | Related[] | null>;

  eagerLoadKeys(_parents: Model[]): RowValue[] {
    return [];
  }

  initRelation(parents: Model[], relationName: string): void {
    for (const parent of parents) {
      parent.setRelation(relationName, this.defaultEagerValue());
    }
  }

  defaultEagerValue(): Related | Related[] | null {
    return null;
  }

  async eagerLoad(_keys: RowValue[], _parents?: Model[]): Promise<unknown> {
    return [];
  }

  matchEager(_parents: Model[], _results: unknown, _relationName: string): void {}
}