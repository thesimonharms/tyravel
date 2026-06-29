import type { ModelStatic } from '@pondoknusa/database';
import { MemoryVectorSearchDriver, type VectorSearchDriver } from '@pondoknusa/vector';
import type { Embedding, VectorSearchOptions } from '@pondoknusa/vector';
import { formatPgVector, pgVectorOperator } from './pgvector.js';

export class PgVectorSearchDriver implements VectorSearchDriver {
  private readonly fallback = new MemoryVectorSearchDriver();

  async search(
    model: ModelStatic,
    embedding: Embedding,
    options: VectorSearchOptions = {},
  ): Promise<Record<string, unknown>[]> {
    if (options.queryBuilder || options.filteredRows) {
      return this.fallback.search(model, embedding, options);
    }

    const connection = model.getConnection();
    if (connection.grammar.driver !== 'postgres') {
      throw new Error('PgVectorSearchDriver requires a postgres database connection.');
    }

    const column = options.column ?? model.vectorColumn ?? 'embedding';
    const metric = options.metric ?? 'cosine';
    const limit = options.limit ?? 10;
    const operator = pgVectorOperator(metric);
    const vectorLiteral = formatPgVector(embedding);
    const grammar = connection.grammar;
    const table = grammar.wrapIdentifier(model.table);
    const vectorColumn = grammar.wrapIdentifier(column);
    const bindings: Array<string | number> = [vectorLiteral];
    let sql =
      `SELECT *, (${vectorColumn} ${operator} $1::vector) AS distance`
      + ` FROM ${table}`;

    if (options.threshold !== undefined) {
      const scoreExpr = metric === 'cosine'
        ? `(1 - (${vectorColumn} ${operator} $1::vector))`
        : metric === 'inner_product'
          ? `(-(${vectorColumn} ${operator} $1::vector))`
          : `(1 / (1 + (${vectorColumn} ${operator} $1::vector)))`;
      sql += ` WHERE ${scoreExpr} >= $2`;
      bindings.push(options.threshold);
    }

    sql += ` ORDER BY ${vectorColumn} ${operator} $1::vector ASC LIMIT ${limit}`;
    const result = await connection.query(sql, bindings);
    return result.rows.map((row) => {
      const distance = Number(row.distance ?? 0);
      const score = metric === 'cosine'
        ? Math.max(0, 1 - distance)
        : metric === 'inner_product'
          ? Math.max(0, -distance)
          : 1 / (1 + distance);
      return { ...row, distance, score };
    });
  }
}