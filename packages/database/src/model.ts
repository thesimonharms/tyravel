import { ModelQueryBuilder } from './model-query-builder.js';
import type { LengthAwarePaginator } from './paginator.js';
import type { ModelStatic } from './model-types.js';
import { BelongsToManyRelation } from './relations/belongs-to-many.js';
import { BelongsToRelation } from './relations/belongs-to.js';
import { HasManyRelation } from './relations/has-many.js';
import { HasOneRelation } from './relations/has-one.js';
import type { Pivot } from './pivot.js';
import { MorphManyRelation } from './relations/morph-many.js';
import { MorphToRelation } from './relations/morph-to.js';
import { getContextConnection } from './connection-context.js';
import type { DatabaseConnection } from './connection.js';
import { SoftDeletingScope, type GlobalScope } from './scopes.js';
import {
  serializeAttributesForStorage,
  type ModelCastMap,
} from './model-casts.js';
import { fireModelEvent } from './model-events.js';
import {
  readAccessorValue,
  serializeAppendedValue,
} from './model-serialization.js';
import type { Row, RowValue } from './types.js';
import {
  forgetModelAttribute,
  rememberModelAttribute,
  setModelAttributeCacheResolver,
  type AttributeCacheStore,
} from './model-attribute-cache.js';
import {
  forgetQueryResult,
  rememberQueryResult,
} from './model-query-cache.js';
import { setPreventLazyLoading } from './lazy-loading.js';
import type { Relation } from './relations/relation.js';
import { singularSnakeCase } from './utils.js';

type ModelAttributes = Record<string, unknown>;

const softDeleteScopeEnsured = new WeakMap<typeof Model, boolean>();

export class Model<T extends ModelAttributes = ModelAttributes> {
  static table = '';
  static primaryKey = 'id';
  static incrementing = true;
  static keyType: 'int' | 'string' = 'int';
  static appends: string[] = [];
  static casts: ModelCastMap = {};
  static softDeletes = false;
  static deletedAt = 'deleted_at';
  static morphName?: string;
  private static resolver: (() => DatabaseConnection) | undefined;
  private static globalScopes: GlobalScope[] = [];
  private static attributeCachePrefix = 'model:attribute';
  private static queryCachePrefix = 'model:query';

  protected attributes: Partial<T>;
  private relations: Record<string, unknown> = {};
  private runtimeAppends: string[] = [];

  constructor(attributes: Partial<T> = {}, takeOwnership = false) {
    this.attributes = takeOwnership ? attributes : { ...attributes };
  }

  static setConnectionResolver(resolver: () => DatabaseConnection): void {
    this.resolver = resolver;
  }

  static setCacheResolver(resolver: () => AttributeCacheStore): void {
    setModelAttributeCacheResolver(resolver);
  }

  static setAttributeCachePrefix(prefix: string): void {
    this.attributeCachePrefix = prefix;
  }

  static preventLazyLoading(enabled = true): void {
    setPreventLazyLoading(enabled);
  }

  protected relation<T extends Relation>(name: string, factory: () => T): T {
    return factory().setRelationName(name);
  }

  static useConnection(connection: DatabaseConnection): void {
    this.setConnectionResolver(() => connection);
  }

  static addGlobalScope(scope: GlobalScope): void {
    if (this.globalScopes.some((existing) => existing.name === scope.name)) {
      return;
    }
    this.globalScopes.push(scope);
  }

  static withoutGlobalScope(scope: GlobalScope | string): ModelQueryBuilder {
    return this.query().withoutGlobalScope(scope);
  }

  static getConnection(): DatabaseConnection {
    const context = getContextConnection();
    if (context) {
      return context;
    }

    if (!this.resolver) {
      throw new Error(
        `Database connection not configured for ${this.name}. Register DatabaseServiceProvider first.`,
      );
    }
    return this.resolver();
  }

  static query(): ModelQueryBuilder {
    const model = this as unknown as ModelStatic;
    if (model.softDeletes && !softDeleteScopeEnsured.get(this)) {
      if (!this.globalScopes.some((scope) => scope.name === SoftDeletingScope.name)) {
        this.addGlobalScope(SoftDeletingScope);
      }
      softDeleteScopeEnsured.set(this, true);
    }

    const builder = new ModelQueryBuilder(
      model.getConnection(),
      model.table,
      model,
    );
    return builder.setGlobalScopes(this.globalScopes);
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

  static select(...columns: string[]): ModelQueryBuilder {
    const model = this as unknown as ModelStatic;
    return model.query().select(...columns);
  }

  static async paginate<TModel extends Model>(
    this: new (attributes?: Partial<ModelAttributes>) => TModel,
    perPage = 15,
    page = 1,
  ): Promise<LengthAwarePaginator<TModel>> {
    const model = this as unknown as ModelStatic;
    return model.query().paginateModels<TModel>(perPage, page);
  }

  static async remember<TValue>(
    this: ModelStatic,
    key: string,
    ttlSeconds: number,
    callback: () => TValue | Promise<TValue>,
  ): Promise<TValue> {
    return rememberQueryResult(this, key, ttlSeconds, callback, Model.queryCachePrefix);
  }

  static async forgetRemembered(key: string): Promise<void> {
    const model = this as unknown as ModelStatic;
    await forgetQueryResult(model, key, Model.queryCachePrefix);
  }

  static async insertMany(
    rows: Array<Partial<ModelAttributes>>,
  ): Promise<number> {
    if (rows.length === 0) {
      return 0;
    }

    const model = this as unknown as ModelStatic & typeof Model;
    const payloads = rows.map((row) =>
      serializeAttributesForStorage(row as Record<string, unknown>, model.casts),
    );

    return model.query().insertMany(payloads);
  }

  static async create<TModel extends Model>(
    this: new (attributes?: Partial<ModelAttributes>) => TModel,
    attributes: Partial<ModelAttributes>,
  ): Promise<TModel> {
    const instance = new this(attributes);
    if (!(await fireModelEvent(instance, 'creating'))) {
      return instance;
    }

    const model = this as unknown as ModelStatic & typeof Model;
    const payload = serializeAttributesForStorage(
      instance.attributes as Record<string, unknown>,
      model.casts,
    );
    const id = await model.query().insert(payload);
    if (id !== undefined && model.incrementing) {
      instance.setAttribute(model.primaryKey as keyof ModelAttributes, id as never);
    }

    await fireModelEvent(instance, 'created');

    return instance;
  }

  static with(...relations: string[]): ModelQueryBuilder {
    const model = this as unknown as ModelStatic;
    return model.query().with(...relations);
  }

  static withTrashed(): ModelQueryBuilder {
    return this.query().withTrashedModels();
  }

  static onlyTrashed(): ModelQueryBuilder {
    return this.query().onlyTrashedModels();
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

  morphMany<Related extends Model>(
    RelatedModel: ModelStatic,
    name?: string,
    morphType?: string,
    morphId?: string,
    localKey?: string,
  ): MorphManyRelation<Related> {
    const relationName = name ?? singularSnakeCase(RelatedModel.name);
    return new MorphManyRelation<Related>(
      this,
      RelatedModel,
      relationName,
      morphType,
      morphId,
      localKey,
    );
  }

  morphTo<Related extends Model>(
    name?: string,
    morphType?: string,
    morphId?: string,
    ownerKey?: string,
  ): MorphToRelation<Related> {
    const relationName = name ?? 'parent';
    return new MorphToRelation<Related>(
      this,
      relationName,
      morphType,
      morphId,
      ownerKey,
    );
  }

  getPivot(): Pivot | undefined {
    return this.getRelation('pivot') as Pivot | undefined;
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

  async rememberAttribute<TValue>(
    attribute: string,
    ttlSeconds: number,
    callback: () => TValue | Promise<TValue>,
  ): Promise<TValue> {
    const model = this.constructor as unknown as ModelStatic;
    const primaryKey = model.primaryKey;
    const id = this.attributes[primaryKey as keyof T];

    if (id === undefined || id === null) {
      return callback();
    }

    return rememberModelAttribute(
      model,
      id,
      attribute,
      ttlSeconds,
      callback,
      Model.attributeCachePrefix,
    );
  }

  async forgetRememberedAttribute(attribute: string): Promise<void> {
    const model = this.constructor as unknown as ModelStatic;
    const primaryKey = model.primaryKey;
    const id = this.attributes[primaryKey as keyof T];

    if (id === undefined || id === null) {
      return;
    }

    await forgetModelAttribute(model, id, attribute, Model.attributeCachePrefix);
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

  async save(options?: { skipBefore?: 'creating' | 'updating' }): Promise<this> {
    const model = this.constructor as unknown as ModelStatic & typeof Model;
    const primaryKey = model.primaryKey;
    const id = this.attributes[primaryKey as keyof T];
    const isNew = id === undefined || id === null;
    const event = isNew ? 'creating' : 'updating';

    if (options?.skipBefore !== event && !(await fireModelEvent(this, event))) {
      return this;
    }

    const payload = serializeAttributesForStorage(
      this.attributes as Record<string, unknown>,
      model.casts,
    );

    if (isNew) {
      const insertedId = await model.query().insert(payload);
      if (insertedId !== undefined && model.incrementing) {
        this.setAttribute(primaryKey as keyof T, insertedId as T[keyof T]);
      }
      await fireModelEvent(this, 'created');
      return this;
    }

    await model
      .query()
      .where(primaryKey, id as RowValue)
      .update(payload);

    await fireModelEvent(this, 'updated');
    return this;
  }

  async update(attributes: Partial<ModelAttributes>): Promise<this> {
    const rollback = new Map<string, unknown>();
    for (const [key, value] of Object.entries(attributes)) {
      rollback.set(key, this.attributes[key as keyof T]);
      this.setAttribute(key as keyof T, value as T[keyof T]);
    }

    if (!(await fireModelEvent(this, 'updating'))) {
      for (const [key, value] of rollback) {
        this.setAttribute(key as keyof T, value as T[keyof T]);
      }
      return this;
    }

    return this.save({ skipBefore: 'updating' });
  }

  async delete(): Promise<void> {
    const model = this.constructor as unknown as ModelStatic & typeof Model;

    if (!(await fireModelEvent(this, 'deleting'))) {
      return;
    }

    if (model.softDeletes) {
      await this.softDelete();
      return;
    }

    const primaryKey = model.primaryKey;
    const id = this.attributes[primaryKey as keyof T];

    if (id === undefined || id === null) {
      throw new Error(`Cannot delete ${model.name} without a primary key.`);
    }

    await model.query().where(primaryKey, id as RowValue).delete();
    await fireModelEvent(this, 'deleted');
  }

  async softDelete(): Promise<void> {
    const model = this.constructor as typeof Model;
    const deletedAt = model.deletedAt;
    const timestamp = Math.floor(Date.now() / 1000);
    await this.update({ [deletedAt]: timestamp } as Partial<ModelAttributes>);
    await fireModelEvent(this, 'deleted');
  }

  async restore(): Promise<void> {
    const model = this.constructor as typeof Model;

    if (!(await fireModelEvent(this, 'restoring'))) {
      return;
    }

    await this.update({ [model.deletedAt]: null } as Partial<ModelAttributes>);
    await fireModelEvent(this, 'restored');
  }

  async forceDelete(): Promise<void> {
    const model = this.constructor as unknown as ModelStatic;

    if (!(await fireModelEvent(this, 'deleting'))) {
      return;
    }

    const primaryKey = model.primaryKey;
    const id = this.attributes[primaryKey as keyof T];

    if (id === undefined || id === null) {
      throw new Error(`Cannot delete ${model.name} without a primary key.`);
    }

    await model.query().withTrashedModels().where(primaryKey, id as RowValue).delete();
    await fireModelEvent(this, 'deleted');
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