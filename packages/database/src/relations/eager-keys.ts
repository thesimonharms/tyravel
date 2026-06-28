import type { RowValue } from '../types.js';

/** Deduplicate non-null eager-load keys to shrink IN clauses and statement-cache churn. */
export function dedupeEagerKeys(keys: RowValue[]): RowValue[] {
  if (keys.length <= 1) {
    return keys;
  }

  const seen = new Set<RowValue>();
  const unique: RowValue[] = [];

  for (const key of keys) {
    if (key === undefined || key === null || seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(key);
  }

  return unique;
}