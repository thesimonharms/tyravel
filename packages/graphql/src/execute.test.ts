import { describe, expect, it, vi } from 'vitest';
import { ArrayStore } from '@pondoknusa/cache';
import { executeGraphQL, executeNamedOperation } from './execute.js';
import { createOperationRegistry } from './operations.js';
import { defineSchema, defineType } from './schema.js';

const schema = defineSchema({
  Query: {
    hello: {
      resolve: (_parent, args: { name?: string }) => `Hello, ${args.name ?? 'world'}!`,
    },
    version: {
      resolve: () => '0.14.0',
      cache: { ttl: 120, key: () => 'version' },
    },
    fail: {
      resolve: () => {
        throw new Error('resolver failed');
      },
    },
    documents: {
      resolve: () => [
        { __typename: 'Document', id: 1, source: 'readme.md' },
        { __typename: 'Document', id: 2, source: 'guide.md' },
      ],
    },
  },
  types: {
    Document: defineType({
      id: {
        resolve: (parent) => (parent as { id: number }).id,
      },
      source: {
        resolve: (parent) => (parent as { source: string }).source,
      },
    }),
  },
});

describe('executeGraphQL', () => {
  it('executes root query fields', async () => {
    const result = await executeGraphQL({
      schema,
      document: '{ hello version }',
    });

    expect(result).toEqual({
      data: {
        hello: 'Hello, world!',
        version: '0.14.0',
      },
    });
  });

  it('resolves variables and nested selections', async () => {
    const result = await executeGraphQL({
      schema,
      document: 'query ($name: String) { hello(name: $name) documents { id source } }',
      variables: { name: 'Pondoknusa' },
    });

    expect(result.data?.hello).toBe('Hello, Pondoknusa!');
    expect(result.data?.documents).toEqual([
      { id: 1, source: 'readme.md' },
      { id: 2, source: 'guide.md' },
    ]);
  });

  it('returns partial data when one root field fails', async () => {
    const result = await executeGraphQL({
      schema,
      document: '{ hello fail version }',
    });

    expect(result.data).toEqual({
      hello: 'Hello, world!',
      version: '0.14.0',
    });
    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]?.message).toBe('resolver failed');
    expect(result.errors?.[0]?.path).toEqual(['fail']);
  });

  it('caches field resolvers and operation responses', async () => {
    const cache = new ArrayStore();
    const versionResolve = vi.spyOn(schema.queryFields.version!, 'resolve');

    await executeGraphQL({
      schema,
      document: '{ version }',
      cache,
    });
    await executeGraphQL({
      schema,
      document: '{ version }',
      cache,
    });

    expect(versionResolve).toHaveBeenCalledTimes(1);
  });
});

describe('executeNamedOperation', () => {
  it('runs registered persisted operations', async () => {
    const operations = createOperationRegistry([
      {
        name: 'Hello',
        type: 'query',
        document: 'query Hello { hello }',
      },
    ]);

    const result = await executeNamedOperation(operations, 'Hello', { schema });
    expect(result).toEqual({ data: { hello: 'Hello, world!' } });
  });

  it('returns an error for unknown operations', async () => {
    const operations = createOperationRegistry();
    const result = await executeNamedOperation(operations, 'Missing', { schema });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.message).toBe('Unknown operation [Missing].');
  });
});