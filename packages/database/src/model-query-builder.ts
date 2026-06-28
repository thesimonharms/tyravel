import type { DatabaseConnection } from './connection.js';
import { EagerLoader } from './eager-loader.js';
import { applyCastsInPlace, resolveCastsForColumns, type ModelCastMap } from './model-casts.js';
import { LengthAwarePaginator } from './paginator.js';
import { QueryBuilder } from './query-builder.js';
import type { Model } from './model.js';
import type { ModelAttributes, ModelStatic } from './model-types.js';
import { scopeMethodName, type GlobalScope, type LocalScope } from './scopes.js';

export class ModelQueryBuilder extends QueryBuilder {
  protected eagerLoad: string[] = [];
  private activeCasts: ModelCastMap;
  private withTrashed = false;
  private onlyTrashed = false;
  private ignoredGlobalScopes = new Set<string>();
  private pendingGlobalScopes: GlobalScope[] = [];
  private globalScopesApplied = false;

  constructor(
    connection: DatabaseConnection,
    tableName: string,
    private readonly model: ModelStatic,
  ) {
    super(connection, tableName);
    this.activeCasts = resolveCastsForColumns(
      (model as typeof Model).casts,
      this.columns,
    );
  }

  override select(...columns: string[]): this {
    super.select(...columns);
    this.activeCasts = resolveCastsForColumns(
      (this.model as typeof Model).casts,
      this.columns,
    );
    return this;
  }

  getModel(): ModelStatic {
    return this.model;
  }

  with(...relations: string[]): this {
    this.eagerLoad.push(...relations);
    return this;
  }

  withTrashedModels(): this {
    this.withTrashed = true;
    return this;
  }

  onlyTrashedModels(): this {
    this.withTrashed = true;
    this.onlyTrashed = true;
    return this;
  }

  withoutGlobalScope(scope: GlobalScope | string): this {
    const name = typeof scope === 'string' ? scope : scope.name;
    this.ignoredGlobalScopes.add(name);
    return this;
  }

  withoutGlobalScopes(): this {
    this.ignoredGlobalScopes.add('*');
    return this;
  }

  setGlobalScopes(scopes: GlobalScope[]): this {
    this.pendingGlobalScopes = scopes;
    return this;
  }

  shouldApplyGlobalScope(name: string): boolean {
    return !this.ignoredGlobalScopes.has('*') && !this.ignoredGlobalScopes.has(name);
  }

  private applyPendingGlobalScopes(): void {
    if (this.globalScopesApplied) {
      return;
    }

    for (const scope of this.pendingGlobalScopes) {
      if (!this.shouldApplyGlobalScope(scope.name)) {
        continue;
      }

      scope.apply(this);
    }

    this.globalScopesApplied = true;
  }

  override clone(): ModelQueryBuilder {
    const builder = new ModelQueryBuilder(
      this.connection,
      this.getTableName(),
      this.model,
    );
    this.copyTo(builder);
    return builder;
  }

  protected override copyTo(builder: QueryBuilder): void {
    super.copyTo(builder);
    if (builder instanceof ModelQueryBuilder) {
      builder.eagerLoad = [...this.eagerLoad];
      builder.withTrashed = this.withTrashed;
      builder.onlyTrashed = this.onlyTrashed;
      builder.ignoredGlobalScopes = new Set(this.ignoredGlobalScopes);
      builder.pendingGlobalScopes = [...this.pendingGlobalScopes];
      builder.globalScopesApplied = this.globalScopesApplied;
      builder.activeCasts = this.activeCasts;
    }
  }

  applySoftDeleteScope(): void {
    const model = this.model as typeof Model;
    if (!model.softDeletes || this.withTrashed) {
      return;
    }

    if (this.onlyTrashed) {
      this.whereNotNull(model.deletedAt);
      return;
    }

    this.whereNull(model.deletedAt);
  }

  override async get(): Promise<Record<string, unknown>[]> {
    this.applyPendingGlobalScopes();
    return super.get();
  }

  override async count(column = '*'): Promise<number> {
    this.applyPendingGlobalScopes();
    return super.count(column);
  }

  applyScope(name: string, ...args: unknown[]): this {
    const scopeName = scopeMethodName(name);
    const scope = (this.model as unknown as Record<string, LocalScope | undefined>)[
      scopeName
    ];

    if (!scope) {
      throw new Error(`Scope [${name}] not defined on model [${this.model.name}].`);
    }

    const result = scope.call(this.model, this, ...args);
    return (result as this) ?? this;
  }

  async getModels<TModel extends Model>(): Promise<TModel[]> {
    const rows = await this.get();
    const ModelClass = this.model as new (
      attributes?: Partial<ModelAttributes>,
      takeOwnership?: boolean,
    ) => TModel;
    const hasCasts = Object.keys(this.activeCasts).length > 0;
    const models = rows.map((row) => {
      if (hasCasts) {
        applyCastsInPlace(row, this.activeCasts);
      }
      return new ModelClass(row, true);
    });

    if (this.eagerLoad.length > 0) {
      await EagerLoader.load(models, this.eagerLoad, this.model);
    }

    return models;
  }

  async firstModel<TModel extends Model>(): Promise<TModel | null> {
    const rows = await this.clone().limit(1).getModels<TModel>();
    return rows[0] ?? null;
  }

  async paginateModels<TModel extends Model>(
    perPage = 15,
    page = 1,
  ): Promise<LengthAwarePaginator<TModel>> {
    const resolvedPage = LengthAwarePaginator.resolvePage(page);
    const resolvedPerPage = LengthAwarePaginator.resolvePerPage(perPage);
    const [total, items] = await Promise.all([
      this.clone().count(),
      this.clone()
        .offset((resolvedPage - 1) * resolvedPerPage)
        .limit(resolvedPerPage)
        .getModels<TModel>(),
    ]);

    return new LengthAwarePaginator(items, total, resolvedPerPage, resolvedPage);
  }
}

export function applyGlobalScopes(
  builder: ModelQueryBuilder,
  scopes: GlobalScope[],
): ModelQueryBuilder {
  let current = builder;
  for (const scope of scopes) {
    if (!current.shouldApplyGlobalScope(scope.name)) {
      continue;
    }

    const result = scope.apply(current);
    if (result) {
      current = result;
    }
  }
  return current;
}