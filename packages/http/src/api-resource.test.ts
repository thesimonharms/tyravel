import { describe, expect, it } from 'vitest';
import { JsonResource } from './api-resource.js';
import { resolveHttpResult } from './resolve-resource.js';
import { TyravelRequest } from './request.js';

type UserLike = {
  id: number;
  name: string;
  email: string;
};

class UserResource extends JsonResource<UserLike> {
  toArray() {
    return {
      id: this.resource.id,
      name: this.resource.name,
      email: this.resource.email,
    };
  }
}

describe('API resources', () => {
  it('wraps a single resource in a data envelope by default', async () => {
    const resource = UserResource.make({
      id: 1,
      name: 'Ada',
      email: 'ada@example.com',
    });

    expect(await resource.resolve()).toEqual({
      data: {
        id: 1,
        name: 'Ada',
        email: 'ada@example.com',
      },
    });
  });

  it('transforms resource collections', async () => {
    const collection = UserResource.collection([
      { id: 1, name: 'Ada', email: 'ada@example.com' },
      { id: 2, name: 'Grace', email: 'grace@example.com' },
    ]);

    expect(await collection.resolve()).toEqual({
      data: [
        { id: 1, name: 'Ada', email: 'ada@example.com' },
        { id: 2, name: 'Grace', email: 'grace@example.com' },
      ],
    });
  });

  it('transforms paginated collections while preserving pagination metadata', async () => {
    const paginator = {
      items: [{ id: 1, name: 'Ada', email: 'ada@example.com' }],
      toArray() {
        return {
          data: this.items,
          currentPage: 2,
          perPage: 10,
          total: 11,
          lastPage: 2,
          from: 11,
          to: 11,
        };
      },
    };
    const collection = UserResource.collection(paginator);

    expect(await collection.resolve()).toEqual({
      data: [{ id: 1, name: 'Ada', email: 'ada@example.com' }],
      currentPage: 2,
      perPage: 10,
      total: 11,
      lastPage: 2,
      from: 11,
      to: 11,
    });
  });

  it('resolves resources returned from controllers', async () => {
    const request = new TyravelRequest(new Request('http://localhost/users/1'));
    const response = await resolveHttpResult(
      UserResource.make({ id: 1, name: 'Ada', email: 'ada@example.com' }),
      request,
    );

    expect(await response.json()).toEqual({
      data: { id: 1, name: 'Ada', email: 'ada@example.com' },
    });
  });

  it('allows unwrapped resources when wrap is disabled', async () => {
    class PlainUserResource extends JsonResource<UserLike> {
      static override wrap = null;

      toArray() {
        return {
          id: this.resource.id,
          name: this.resource.name,
        };
      }
    }

    const resource = PlainUserResource.make({ id: 3, name: 'Lin', email: 'lin@example.com' });
    expect(await resource.resolve()).toEqual({ id: 3, name: 'Lin' });
  });
});