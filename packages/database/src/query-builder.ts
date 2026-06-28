import type { DatabaseConnection } from './connection.js';
import type { SqlGrammar } from './grammar.js';
import { LengthAwarePaginator } from './paginator.js';
import type { Row, RowValue, WhereClause, WhereOperator } from './types.js';

export class QueryBuilder<T extends Row = Row> {
  protected columns: string[] = ['*'];
  protected wheres: WhereClause[] = [];
  protected orders: Array<{ column: string; direction: 'asc' | 'desc' }> = [];
  protected limitCount?: number;
  protected offsetCount?: number;
  protected readonly grammar: SqlGrammar;

  constructor(
    protected readonly connection: DatabaseConnection,
    protected readonly tableName: string,
  ) {
    this.grammar = connection.grammar;
  }

  getQueryConnection(): DatabaseConnection {
    return this.connection;
  }

  getTableName(): string {
    return this.tableName;
  }

  select(...columns: string[]): this {
    this.columns = columns.length > 0 ? columns : ['*'];
    return this;
  }

  where(column: string, operatorOrValue: WhereOperator | RowValue, value?: RowValue): this {
    this.pushWhere(column, operatorOrValue, value, 'and');
    return this;
  }

  orWhere(column: string, operatorOrValue: WhereOperator | RowValue, value?: RowValue): this {
    this.pushWhere(column, operatorOrValue, value, 'or');
    return this;
  }

  private pushWhere(
    column: string,
    operatorOrValue: WhereOperator | RowValue,
    value: RowValue | undefined,
    boolean: 'and' | 'or',
  ): void {
    if (value === undefined) {
      this.wheres.push({
        type: 'basic',
        column,
        operator: '=',
        value: operatorOrValue,
        boolean,
      });
      return;
    }

    this.wheres.push({
      type: 'basic',
      column,
      operator: operatorOrValue as WhereOperator,
      value,
      boolean,
    });
  }

  whereIn(column: string, values: RowValue[]): this {
    this.wheres.push({
      type: 'in',
      column,
      operator: 'in',
      value: values,
      boolean: 'and',
    });
    return this;
  }

  whereNull(column: string): this {
    this.wheres.push({
      type: 'null',
      column,
      operator: 'is',
      value: null,
      boolean: 'and',
    });
    return this;
  }

  whereNotNull(column: string): this {
    this.wheres.push({
      type: 'null',
      column,
      operator: 'is not',
      value: null,
      boolean: 'and',
    });
    return this;
  }

  orderBy(column: string, direction: 'asc' | 'desc' = 'asc'): this {
    this.orders.push({ column, direction });
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  offset(count: number): this {
    this.offsetCount = count;
    return this;
  }

  clone(): QueryBuilder<T> {
    const builder = new QueryBuilder<T>(this.connection, this.tableName);
    this.copyTo(builder);
    return builder;
  }

  protected copyTo(builder: QueryBuilder<T>): void {
    builder.columns = [...this.columns];
    builder.wheres = [...this.wheres];
    builder.orders = [...this.orders];
    builder.limitCount = this.limitCount;
    builder.offsetCount = this.offsetCount;
  }

  async get(): Promise<T[]> {
    const { sql, bindings } = this.buildSelect();
    const result = await this.connection.query(sql, bindings);
    return result.rows as T[];
  }

  async first(): Promise<T | null> {
    const rows = await this.clone().limit(1).get();
    return rows[0] ?? null;
  }

  async count(column = '*'): Promise<number> {
    const bindings: RowValue[] = [];
    const where = this.compileWheres(bindings);
    const countExpression =
      column === '*'
        ? 'COUNT(*)'
        : `COUNT(${this.grammar.wrapIdentifier(column)})`;
    const sql = `SELECT ${countExpression} as "aggregate" FROM ${this.grammar.wrapIdentifier(this.tableName)}${where.sql}`;
    const result = await this.connection.query(sql, bindings);
    const aggregate = result.rows[0]?.aggregate;
    return Number(aggregate ?? 0);
  }

  async forPage(page: number, perPage: number): Promise<T[]> {
    const resolvedPage = LengthAwarePaginator.resolvePage(page);
    const resolvedPerPage = LengthAwarePaginator.resolvePerPage(perPage);
    return this.clone()
      .offset((resolvedPage - 1) * resolvedPerPage)
      .limit(resolvedPerPage)
      .get();
  }

  async paginate(
    perPage = 15,
    page = 1,
  ): Promise<LengthAwarePaginator<T>> {
    const resolvedPage = LengthAwarePaginator.resolvePage(page);
    const resolvedPerPage = LengthAwarePaginator.resolvePerPage(perPage);
    const [total, items] = await Promise.all([
      this.clone().count(),
      this.forPage(resolvedPage, resolvedPerPage),
    ]);

    return new LengthAwarePaginator(items, total, resolvedPerPage, resolvedPage);
  }

  async insertMany(rows: Array<Partial<T>>): Promise<number> {
    if (rows.length === 0) {
      return 0;
    }

    const normalized = rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).filter(([, value]) => value !== undefined),
      ),
    ) as Array<Partial<T>>;

    const columnSet = new Set<string>();
    for (const row of normalized) {
      for (const column of Object.keys(row)) {
        columnSet.add(column);
      }
    }

    const columns = [...columnSet];
    const wrappedColumns = columns.map((column) => this.grammar.wrapIdentifier(column));
    const valueGroups: string[] = [];
    const bindings: RowValue[] = [];

    for (const row of normalized) {
      const placeholders: string[] = [];
      for (const column of columns) {
        bindings.push((row[column] ?? null) as RowValue);
        placeholders.push(this.grammar.parameter(bindings.length));
      }
      valueGroups.push(`(${placeholders.join(', ')})`);
    }

    const sql = `INSERT INTO ${this.grammar.wrapIdentifier(this.tableName)} (${wrappedColumns.join(', ')}) VALUES ${valueGroups.join(', ')}`;
    const result = await this.connection.query(sql, bindings);
    return result.changes;
  }

  async insert(attributes: Partial<T>): Promise<number | bigint | undefined> {
    const entries = Object.entries(attributes).filter(([, value]) => value !== undefined);
    const columns = entries.map(([column]) => this.grammar.wrapIdentifier(column));
    const bindings = entries.map(([, value]) => value as RowValue);
    const placeholders = this.placeholderList(bindings.length);

    let sql = `INSERT INTO ${this.grammar.wrapIdentifier(this.tableName)} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;

    if (this.grammar.supportsReturning) {
      sql += ` RETURNING ${this.grammar.wrapIdentifier('id')}`;
      const result = await this.connection.query(sql, bindings);
      const id = result.rows[0]?.id;
      return typeof id === 'number' || typeof id === 'bigint' ? id : undefined;
    }

    const result = await this.connection.query(sql, bindings);
    return result.lastInsertId;
  }

  async update(attributes: Partial<T>): Promise<number> {
    const entries = Object.entries(attributes).filter(([, value]) => value !== undefined);
    const bindings = entries.map(([, value]) => value as RowValue);
    const sets = entries.map(([column], index) =>
      `${this.grammar.wrapIdentifier(column)} = ${this.grammar.parameter(index + 1)}`,
    );

    const whereBindings: RowValue[] = [];
    const where = this.compileWheres(whereBindings, bindings.length);
    const sql = `UPDATE ${this.grammar.wrapIdentifier(this.tableName)} SET ${sets.join(', ')}${where.sql}`;
    const result = await this.connection.query(sql, [...bindings, ...whereBindings]);
    return result.changes;
  }

  async delete(): Promise<number> {
    const bindings: RowValue[] = [];
    const where = this.compileWheres(bindings);
    const sql = `DELETE FROM ${this.grammar.wrapIdentifier(this.tableName)}${where.sql}`;
    const result = await this.connection.query(sql, bindings);
    return result.changes;
  }

  toSql(): { sql: string; bindings: RowValue[] } {
    return this.buildSelect();
  }

  protected buildSelect(): { sql: string; bindings: RowValue[] } {
    const bindings: RowValue[] = [];
    const columns = this.columns.map((column) =>
      column === '*' ? '*' : this.grammar.wrapIdentifier(column),
    );
    const where = this.compileWheres(bindings);

    let sql = `SELECT ${columns.join(', ')} FROM ${this.grammar.wrapIdentifier(this.tableName)}${where.sql}`;

    if (this.orders.length > 0) {
      const orderings = this.orders
        .map(
          (order) =>
            `${this.grammar.wrapIdentifier(order.column)} ${order.direction.toUpperCase()}`,
        )
        .join(', ');
      sql += ` ORDER BY ${orderings}`;
    }

    if (this.limitCount !== undefined) {
      sql += ` LIMIT ${this.grammar.parameter(bindings.length + 1)}`;
      bindings.push(this.limitCount);
    }

    if (this.offsetCount !== undefined) {
      sql += ` OFFSET ${this.grammar.parameter(bindings.length + 1)}`;
      bindings.push(this.offsetCount);
    }

    return { sql, bindings };
  }

  protected compileWheres(
    bindings: RowValue[],
    bindingOffset = 0,
  ): { sql: string } {
    if (this.wheres.length === 0) {
      return { sql: '' };
    }

    const parts: string[] = [];

    for (const [index, clause] of this.wheres.entries()) {
      const prefix = index === 0 ? ' WHERE ' : ` ${clause.boolean.toUpperCase()} `;

      if (clause.type === 'in') {
        const values = clause.value as RowValue[];
        const placeholders = inPlaceholderList(
          this.grammar.driver,
          values.length,
          bindingOffset + bindings.length + 1,
          (index) => this.grammar.parameter(index),
        );
        parts.push(
          `${prefix}${this.grammar.wrapIdentifier(clause.column)} IN (${placeholders})`,
        );
        bindings.push(...values);
        continue;
      }

      if (clause.type === 'null') {
        parts.push(
          `${prefix}${this.grammar.wrapIdentifier(clause.column)} ${clause.operator.toUpperCase()} NULL`,
        );
        continue;
      }

      parts.push(
        `${prefix}${this.grammar.wrapIdentifier(clause.column)} ${clause.operator} ${this.grammar.parameter(bindingOffset + bindings.length + 1)}`,
      );
      bindings.push(clause.value as RowValue);
    }

    return { sql: parts.join('') };
  }

  private placeholderList(count: number): string[] {
    return Array.from({ length: count }, (_, index) =>
      this.grammar.parameter(index + 1),
    );
  }
}

const inPlaceholderCache = new Map<string, string>();

function inPlaceholderList(
  driver: string,
  count: number,
  startIndex: number,
  parameter: (index: number) => string,
): string {
  const cacheKey = `${driver}:${count}:${startIndex}`;
  const cached = inPlaceholderCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const placeholders = Array.from({ length: count }, (_, index) =>
    parameter(startIndex + index),
  ).join(', ');
  inPlaceholderCache.set(cacheKey, placeholders);
  return placeholders;
}