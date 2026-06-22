import type { Model } from './model.js';
import type { ModelStatic } from './model-types.js';
import type { Relation } from './relations/relation.js';

export class EagerLoader {
  static async load(
    parents: Model[],
    relations: string[],
    ModelClass: ModelStatic,
  ): Promise<void> {
    if (parents.length === 0 || relations.length === 0) {
      return;
    }

    const instance = new (ModelClass as new () => Model)();

    for (const relationName of relations) {
      const relationMethod = (instance as unknown as Record<string, unknown>)[relationName];
      if (typeof relationMethod !== 'function') {
        throw new Error(
          `Relation [${relationName}] not defined on model [${ModelClass.name}].`,
        );
      }

      const relation = relationMethod.call(instance) as Relation;
      relation.initRelation(parents, relationName);

      const keys = relation.eagerLoadKeys(parents);
      if (keys.length === 0) {
        continue;
      }

      const results = await relation.eagerLoad(keys, parents);
      relation.matchEager(parents, results, relationName);
    }
  }
}