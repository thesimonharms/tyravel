import type { ModelQueryBuilder } from '@pondoknusa/database';
import type { PondoknusaRequest } from '@pondoknusa/http';
import type { AdminResource } from './admin-resource.js';

export function applyAdminSearch(
  builder: ModelQueryBuilder,
  resource: AdminResource,
  search: string | undefined,
): ModelQueryBuilder {
  const term = search?.trim();
  if (!term || resource.searchable.length === 0) {
    return builder;
  }

  const [first, ...rest] = resource.searchable;
  if (!first) {
    return builder;
  }

  builder.where(first, 'like', `%${term}%`);
  for (const column of rest) {
    builder.orWhere(column, 'like', `%${term}%`);
  }

  return builder;
}

export function applyAdminFilters(
  builder: ModelQueryBuilder,
  resource: AdminResource,
  request: PondoknusaRequest,
): ModelQueryBuilder {
  for (const filter of resource.filters) {
    const value = request.query(`filter_${filter.name}`);
    if (value === undefined || value === '') {
      continue;
    }

    if (filter.options && !(value in filter.options)) {
      continue;
    }

    builder.where(filter.column, value);
  }

  return builder;
}

export function resolveAdminSort(
  resource: AdminResource,
  request: PondoknusaRequest,
): { column: string; direction: 'asc' | 'desc' } {
  const sort = request.query('sort');
  const direction = request.query('direction') === 'desc' ? 'desc' : 'asc';
  const sortable = resource.fields
    .filter((field) => field.sortable !== false)
    .map((field) => field.name);

  if (sort && sortable.includes(sort)) {
    return { column: sort, direction };
  }

  const model = resource.model as { primaryKey?: string };
  return { column: model.primaryKey ?? 'id', direction: 'desc' };
}