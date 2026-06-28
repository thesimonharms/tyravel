/**
 * Per-connection LRU cache for driver prepared statements.
 */
export class PreparedStatementCache<TStatement> {
  private readonly cache = new Map<string, TStatement>();

  constructor(private readonly maxSize = 256) {}

  get(sql: string, factory: () => TStatement): TStatement {
    const existing = this.cache.get(sql);
    if (existing) {
      this.cache.delete(sql);
      this.cache.set(sql, existing);
      return existing;
    }

    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest) {
        this.cache.delete(oldest);
      }
    }

    const statement = factory();
    this.cache.set(sql, statement);
    return statement;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}