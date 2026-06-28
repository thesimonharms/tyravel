export type CastType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'json'
  | 'array'
  | 'datetime';

export interface Cast {
  get(value: unknown): unknown;
  set(value: unknown): unknown;
}

export type ModelCast = CastType | Cast;

export type ModelCastMap = Record<string, ModelCast>;

export function isCustomCast(value: ModelCast): value is Cast {
  return typeof value === 'object' && value !== null && 'get' in value && 'set' in value;
}

export function castAttribute(value: unknown, type: ModelCast): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (isCustomCast(type)) {
    return type.get(value);
  }

  switch (type) {
    case 'string':
      return String(value);
    case 'number': {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : value;
    }
    case 'boolean':
      if (typeof value === 'boolean') {
        return value;
      }
      if (value === 0 || value === '0' || value === 'false') {
        return false;
      }
      return Boolean(value);
    case 'json':
    case 'array':
      if (typeof value === 'string') {
        try {
          return JSON.parse(value) as unknown;
        } catch {
          return value;
        }
      }
      return value;
    case 'datetime':
      if (value instanceof Date) {
        return value;
      }
      if (typeof value === 'number') {
        return new Date(value * 1000);
      }
      if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? value : parsed;
      }
      return value;
    default:
      return value;
  }
}

export function serializeCast(value: unknown, type: ModelCast): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (isCustomCast(type)) {
    return type.set(value);
  }

  switch (type) {
    case 'json':
    case 'array':
      return typeof value === 'string' ? value : JSON.stringify(value);
    case 'datetime':
      if (value instanceof Date) {
        return Math.floor(value.getTime() / 1000);
      }
      return value;
    case 'boolean':
      return value ? 1 : 0;
    default:
      return value;
  }
}

export function applyCastsToAttributes(
  attributes: Record<string, unknown>,
  casts: ModelCastMap,
): Record<string, unknown> {
  const result = { ...attributes };
  applyCastsInPlace(result, casts);
  return result;
}

/** Normalize `select()` column names to attribute keys for cast lookup. */
export function normalizeSelectColumn(column: string): string {
  const trimmed = column.trim();
  const asMatch = trimmed.match(/\s+as\s+([A-Za-z_][\w]*)$/i);
  if (asMatch) {
    return asMatch[1]!;
  }

  const parts = trimmed.split('.');
  return parts[parts.length - 1]!;
}

/**
 * Returns only cast entries for columns present in a pruned `select()` list.
 * When `columns` is empty or includes `*`, the full cast map is returned.
 */
export function resolveCastsForColumns(
  casts: ModelCastMap,
  columns: readonly string[],
): ModelCastMap {
  if (columns.length === 0 || columns.includes('*')) {
    return casts;
  }

  const resolved: ModelCastMap = {};
  for (const column of columns) {
    const key = normalizeSelectColumn(column);
    const cast = casts[key];
    if (cast !== undefined) {
      resolved[key] = cast;
    }
  }

  return resolved;
}

/** Mutates `attributes` when casts apply; safe when the row object is query-owned. */
export function applyCastsInPlace(
  attributes: Record<string, unknown>,
  casts: ModelCastMap,
): Record<string, unknown> {
  for (const [key, type] of Object.entries(casts)) {
    if (key in attributes) {
      attributes[key] = castAttribute(attributes[key], type);
    }
  }

  return attributes;
}

export function serializeAttributesForStorage(
  attributes: Record<string, unknown>,
  casts: ModelCastMap,
): Record<string, unknown> {
  const result = { ...attributes };

  for (const [key, type] of Object.entries(casts)) {
    if (key in result) {
      result[key] = serializeCast(result[key], type);
    }
  }

  return result;
}