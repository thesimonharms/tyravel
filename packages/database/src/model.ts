import { applyGlobalScopes, ModelQueryBuilder } from './model-query-builder.js';
import type { LengthAwarePaginator } from './paginator.js';
import type { ModelStatic } from './model-types.js';
import { BelongsToManyRelation } from './relations/belongs-to-many.js';
import { BelongsToRelation } from './relations/belongs-to.js';
import { HasManyRelation } from './relations/has-many.js';
import { HasOneRelation } from './relations/has-one.js';
import type { DatabaseConnection } from './connection.js';
import type { GlobalScope } from './scopes.js';
import {
  readAccessorValue,
  serializeAppendedValue,
} from './model-serialization.js';
import type { Row, RowValue } from './types.js';
import { singularSnakeCase } from './utils.js';

type ModelAttributes = Record<string, unknown>;

export class Model<T extends ModelAttributes = ModelAttributes> {
  static table = '';
  static primaryKey = 'id';
  static appends: string[] = [];
  private static resolver: (() => DatabaseConnection) | undefined;
  private static globalScopes: GlobalScope[] = [];

  protected attributes: Partial<T>;
  private relations: Record<string, unknown> = {};
  private runtimeAppends: string[] = [];

  constructor(attributes: Partial<T> = {}) {
    this.attributes = { ...attributes };
  }

  static setConnectionResolver(resolver: () => DatabaseConnection): void {
    this.resolver = resolver;
  }

  static useConnection(connection: DatabaseConnection): void {
    this.setConnectionResolver(() => connection);
  }

  static addGlobalScope(scope: GlobalScope): void {
    this.globalScopes.push(scope);
  }

  static getConnection(): DatabaseConnection {
    if (!this.resolver) {
      throw new Error(
        `Database connection not configured for ${this.name}. Register DatabaseServiceProvider first.`,
      );
    }
    return this.resolver();
  }

  static query(): ModelQueryBuilder {
    const model = this as unknown as ModelStatic;
    const builder = new ModelQueryBuilder(
      model.getConnection(),
      model.table,
      model,
    );
    return applyGlobalScopes(builder, this.globalScopes);
  }

  static scope(name: string, ...args: unknown[]): ModelQueryBuilder {
    return this.query().applyScope(name, ...args);
  }

  static async find<TModel extends Model>(
    this: new (attributes?: Partial<ModelAttributes>) => TModel,
    id: RowValue,
  ): Promise<TModel | null> {
    const model = this as unknown as ModelStatic;
    return model.query().where(model.primaryKey, id).firstModel<TModel>();
  }

  static async all<TModel extends Model>(
    this: new (attributes?: Partial<ModelAttributes>) => TModel,
  ): Promise<TModel[]> {
    const model = this as unknown as ModelStatic;
    return model.query().getModels<TModel>();
  }

  static async paginate<TModel extends Model>(
    this: new (attributes?: Partial<ModelAttributes>) => TModel,
    perPage = 15,
    page = 1,
  ): Promise<LengthAwarePaginator<TModel>> {
    const model = this as unknown as ModelStatic;
    return model.query().paginateModels<TModel>(perPage, page);
  }

  static async create<TModel extends Model>(
    this: new (attributes?: Partial<ModelAttributes>) => TModel,
    attributes: Partial<ModelAttributes>,
  ): Promise<TModel> {
    const model = this as unknown as ModelStatic;
    const id = await model.query().insert(attributes);
    if (id !== undefined) {
      const created = await (this as unknown as ModelStatic).find(id);
      if (created) {
        return created as TModel;
      }
    }

    return new this(attributes);
  }

  static with(...relations: string[]): ModelQueryBuilder {
    const model = this as unknown as ModelStatic;
    return model.query().with(...relations);
  }

  static where(
    column: string,
    operatorOrValue?: RowValue | string,
    value?: RowValue,
  ): ModelQueryBuilder {
    const model = this as unknown as ModelStatic;
    const builder = model.query();
    if (operatorOrValue === undefined) {
      return builder;
    }
    return builder.where(column, operatorOrValue as never, value);
  }

  hasMany<Related extends Model>(
    RelatedModel: ModelStatic,
    foreignKey?: string,
    localKey?: string,
  ): HasManyRelation<Related> {
    const parentModel = this.constructor as unknown as ModelStatic;
    return new HasManyRelation<Related>(
      this,
      RelatedModel,
      foreignKey ?? `${singularSnakeCase(parentModel.name)}_id`,
      localKey ?? parentModel.primaryKey,
    );
  }

  hasOne<Related extends Model>(
    RelatedModel: ModelStatic,
    foreignKey?: string,
    localKey?: string,
  ): HasOneRelation<Related> {
    const parentModel = this.constructor as unknown as ModelStatic;
    return new HasOneRelation<Related>(
      this,
      RelatedModel,
      foreignKey ?? `${singularSnakeCase(parentModel.name)}_id`,
      localKey ?? parentModel.primaryKey,
    );
  }

  belongsTo<Related extends Model>(
    RelatedModel: ModelStatic,
    foreignKey?: string,
    ownerKey?: string,
  ): BelongsToRelation<Related> {
    return new BelongsToRelation<Related>(
      this,
      RelatedModel,
      foreignKey ?? `${singularSnakeCase(RelatedModel.name)}_id`,
      ownerKey ?? RelatedModel.primaryKey,
    );
  }

  belongsToMany<Related extends Model>(
    RelatedModel: ModelStatic,
    pivotTable?: string,
    foreignPivotKey?: string,
    relatedPivotKey?: string,
    parentKey?: string,
    relatedKey?: string,
  ): BelongsToManyRelation<Related> {
    const parentModel = this.constructor as unknown as ModelStatic;
    const parentSnake = singularSnakeCase(parentModel.name);
    const relatedSnake = singularSnakeCase(RelatedModel.name);

    return new BelongsToManyRelation<Related>(
      this,
      RelatedModel,
      pivotTable ?? `${parentSnake}_${relatedSnake}`,
      foreignPivotKey ?? `${parentSnake}_id`,
      relatedPivotKey ?? `${relatedSnake}_id`,
      parentKey ?? parentModel.primaryKey,
      relatedKey ?? RelatedModel.primaryKey,
    );
  }

  setRelation(name: string, value: unknown): void {
    this.relations[name] = value;
  }

  getRelation<TRelation>(name: string): TRelation | undefined {
    return this.relations[name] as TRelation | undefined;
  }

  relationLoaded(name: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.relations, name);
  }

  getAttribute<K extends keyof T>(key: K): T[K] | undefined {
    return this.attributes[key];
  }

  setAttribute<K extends keyof T>(key: K, value: T[K]): void {
    this.attributes[key] = value;
  }

  append(...attributes: string[]): this {
    this.runtimeAppends.push(...attributes);
    return this;
  }

  setAppends(attributes: string[]): this {
    this.runtimeAppends = [...attributes];
    return this;
  }

  getAppends(): string[] {
    const model = this.constructor as typeof Model;
    return [...new Set([...model.appends, ...this.runtimeAppends])];
  }

  toJSON(): Record<string, unknown> {
    const result: Record<string, unknown> = { ...this.attributes };

    for (const name of this.getAppends()) {
      if (this.relationLoaded(name)) {
        result[name] = serializeAppendedValue(this.getRelation(name));
        continue;
      }

      const { found, value } = readAccessorValue(this, name, Model.prototype);
      if (found) {
        result[name] = serializeAppendedValue(value);
      }
    }

    return result;
  }

  async save(): Promise<this> {
    const model = this.constructor as unknown as ModelStatic;
    const primaryKey = model.primaryKey;
    const id = this.attributes[primaryKey as keyof T];

    if (id === undefined || id === null) {
      const insertedId = await model.query().insert(this.attributes as Row);
      if (insertedId !== undefined) {
        this.setAttribute(primaryKey as keyof T, insertedId as T[keyof T]);
      }
      return this;
    }

    await model
      .query()
      .where(primaryKey, id as RowValue)
      .update(this.attributes as Row);

    return this;
  }

  async update(attributes: Partial<ModelAttributes>): Promise<this> {
    Object.assign(this.attributes, attributes);
    return this.save();
  }

  async delete(): Promise<void> {
    const model = this.constructor as unknown as ModelStatic;
    const primaryKey = model.primaryKey;
    const id = this.attributes[primaryKey as keyof T];

    if (id === undefined || id === null) {
      throw new Error(`Cannot delete ${model.name} without a primary key.`);
    }

    await model.query().where(primaryKey, id as RowValue).delete();
  }

  async fresh<TModel extends Model>(): Promise<TModel | null> {
    const model = this.constructor as unknown as ModelStatic;
    const primaryKey = model.primaryKey;
    const id = this.attributes[primaryKey as keyof T];

    if (id === undefined || id === null) {
      return null;
    }

    return model.find(normalizeId(id as RowValue)) as Promise<TModel | null>;
  }
}

function normalizeId(id: RowValue | bigint): RowValue {
  return typeof id === 'bigint' ? Number(id) : id;
}