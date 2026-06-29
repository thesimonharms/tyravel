import { describe, expect, it, vi } from 'vitest';
import { PondoknusaRequest } from '@pondoknusa/http';
import type { ModelStatic } from '@pondoknusa/database';
import { defineAdminResource } from './admin-resource.js';
import { applyAdminSearch, resolveAdminSort } from './query.js';

const builder = {
  where: vi.fn(function (this: typeof builder) {
    return this;
  }),
  orWhere: vi.fn(function (this: typeof builder) {
    return this;
  }),
  orderBy: vi.fn(function (this: typeof builder) {
    return this;
  }),
};

const model = {
  name: 'Article',
  primaryKey: 'id',
  query: () => builder,
} as unknown as ModelStatic;

describe('applyAdminSearch', () => {
  it('applies OR search across searchable columns', () => {
    const resource = defineAdminResource('articles', model, {
      fields: [
        { name: 'title', searchable: true },
        { name: 'body', searchable: true },
      ],
    });

    applyAdminSearch(builder as never, resource, 'hello');

    expect(builder.where).toHaveBeenCalledWith('title', 'like', '%hello%');
    expect(builder.orWhere).toHaveBeenCalledWith('body', 'like', '%hello%');
  });
});

describe('resolveAdminSort', () => {
  it('falls back to the primary key when sort is invalid', () => {
    const resource = defineAdminResource('articles', model, {
      fields: [{ name: 'title', sortable: true }],
    });

    const request = new PondoknusaRequest(
      new Request('http://localhost/admin/articles?sort=missing'),
    );
    expect(resolveAdminSort(resource, request)).toEqual({
      column: 'id',
      direction: 'desc',
    });
  });
});