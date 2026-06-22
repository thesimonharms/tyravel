import type { ModelCastMap } from '../model-casts.js';
import type { Model } from '../model.js';
import type { ModelStatic } from '../model-types.js';
import { Pivot } from '../pivot.js';
import type { RowValue } from '../types.js';
import { Relation } from './relation.js';

export class BelongsToManyRelation<Related extends Model = Model> extends Relation<Related> {
  private pivotColumns: string[] = [];
  private pivotCasts: ModelCastMap = {};

  constructor(
    parent: Model,
    relatedModel: ModelStatic,
    private readonly pivotTable: string,
    private readonly foreignPivotKey: string,
    private readonly relatedPivotKey: string,
    private readonly parentKey: string,
    private readonly relatedKey: string,
  ) {
    super(parent, relatedModel);
  }

  withPivot(...columns: string[]): this {
    this.pivotColumns = [...new Set([...this.pivotColumns, ...columns])];
    return this;
  }

  withPivotCasts(casts: ModelCastMap): this {
    this.pivotCasts = { ...this.pivotCasts, ...casts };
    return this;
  }

  async get(): Promise<Related[]> {
    const parentId = this.parent.getAttribute(this.parentKey as never) as RowValue;
    if (parentId === undefined || parentId === null) {
      return [];
    }

    const grammar = this.relatedModel.getConnection().grammar;
    const relatedTable = this.relatedModel.table;
    const pivot = grammar.wrapIdentifier(this.pivotTable);
    const related = grammar.wrapIdentifier(relatedTable);
    const pivotSelect = this.buildPivotSelect(grammar, pivot);

    const sql = `
      SELECT ${related}.*${pivotSelect}
      FROM ${related}
      INNER JOIN ${pivot}
        ON ${related}.${grammar.wrapIdentifier(this.relatedKey)}
         = ${pivot}.${grammar.wrapIdentifier(this.relatedPivotKey)}
      WHERE ${pivot}.${grammar.wrapIdentifier(this.foreignPivotKey)} = ${grammar.parameter(1)}
    `;

    const result = await this.relatedModel.getConnection().query(sql, [parentId]);
    const ModelClass = this.relatedModel as new (
      attributes?: Record<string, unknown>,
    ) => Related;

    return result.rows.map((row) => this.hydrateRelated(ModelClass, row));
  }

  override eagerLoadKeys(parents: Model[]): RowValue[] {
    return parents
      .map((parent) => parent.getAttribute(this.parentKey as never) as RowValue)
      .filter((key) => key !== undefined && key !== null);
  }

  override defaultEagerValue(): Related[] {
    return [];
  }

  override async eagerLoad(keys: RowValue[]): Promise<Array<{ parentKey: RowValue; model: Related }>> {
    const grammar = this.relatedModel.getConnection().grammar;
    const relatedTable = this.relatedModel.table;
    const pivot = grammar.wrapIdentifier(this.pivotTable);
    const related = grammar.wrapIdentifier(relatedTable);
    const parentPivotColumn = grammar.wrapIdentifier(this.foreignPivotKey);
    const placeholders = keys.map((_, index) => grammar.parameter(index + 1)).join(', ');
    const pivotSelect = this.buildPivotSelect(grammar, pivot);

    const sql = `
      SELECT ${related}.*, ${pivot}.${parentPivotColumn} AS "__eager_parent_key"${pivotSelect}
      FROM ${related}
      INNER JOIN ${pivot}
        ON ${related}.${grammar.wrapIdentifier(this.relatedKey)}
         = ${pivot}.${grammar.wrapIdentifier(this.relatedPivotKey)}
      WHERE ${pivot}.${parentPivotColumn} IN (${placeholders})
    `;

    const result = await this.relatedModel.getConnection().query(sql, keys);
    const ModelClass = this.relatedModel as new (
      attributes?: Record<string, unknown>,
    ) => Related;

    return result.rows.map((row) => {
      const parentKey = row.__eager_parent_key as RowValue;
      const attributes = { ...row };
      delete attributes.__eager_parent_key;
      return { parentKey, model: this.hydrateRelated(ModelClass, attributes) };
    });
  }

  override matchEager(
    parents: Model[],
    results: unknown,
    relationName: string,
  ): void {
    const entries = results as Array<{ parentKey: RowValue; model: Related }>;
    const dictionary = new Map<RowValue, Related[]>();

    for (const { parentKey, model } of entries) {
      const bucket = dictionary.get(parentKey);
      if (bucket) {
        bucket.push(model);
      } else {
        dictionary.set(parentKey, [model]);
      }
    }

    for (const parent of parents) {
      const key = parent.getAttribute(this.parentKey as never) as RowValue;
      parent.setRelation(relationName, dictionary.get(key) ?? []);
    }
  }

  private buildPivotSelect(
    grammar: { wrapIdentifier: (name: string) => string },
    pivot: string,
  ): string {
    if (this.pivotColumns.length === 0) {
      return '';
    }

    return this.pivotColumns
      .map(
        (column) =>
          `, ${pivot}.${grammar.wrapIdentifier(column)} AS "__pivot_${column}"`,
      )
      .join('');
  }

  private hydrateRelated(
    ModelClass: new (attributes?: Record<string, unknown>) => Related,
    row: Record<string, unknown>,
  ): Related {
    const attributes = { ...row };
    const pivotAttributes: Record<string, unknown> = {};

    for (const column of this.pivotColumns) {
      const alias = `__pivot_${column}`;
      if (Object.prototype.hasOwnProperty.call(attributes, alias)) {
        pivotAttributes[column] = attributes[alias];
        delete attributes[alias];
      }
    }

    const model = new ModelClass(attributes);

    if (this.pivotColumns.length > 0) {
      model.setRelation(
        'pivot',
        Pivot.fromAttributes(pivotAttributes, this.pivotCasts),
      );
    }

    return model;
  }
}