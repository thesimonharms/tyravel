import { describe, expect, it } from 'vitest';
import { PondoknusaRequest } from '@pondoknusa/http';
import { createGraphQLHandler } from './handler.js';
import { createOperationRegistry } from './operations.js';
import { defineSchema } from './schema.js';

const schema = defineSchema({
  Query: {
    hello: {
      resolve: () => 'world',
    },
  },
});

describe('createGraphQLHandler', () => {
  it('handles POST requests with inline queries', async () => {
    const handler = createGraphQLHandler({ schema });
    const request = new PondoknusaRequest(
      new Request('http://localhost/graphql', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: '{ hello }' }),
      }),
    );

    const response = await handler(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { hello: 'world' } });
  });

  it('handles GET requests with query parameters', async () => {
    const handler = createGraphQLHandler({ schema });
    const request = new PondoknusaRequest(
      new Request('http://localhost/graphql?query=%7B%20hello%20%7D'),
    );

    const response = await handler(request);
    expect(await response.json()).toEqual({ data: { hello: 'world' } });
  });

  it('executes named persisted operations when registered', async () => {
    const operations = createOperationRegistry([
      {
        name: 'Hello',
        type: 'query',
        document: 'query Hello { hello }',
      },
    ]);
    const handler = createGraphQLHandler({ schema, operations });
    const request = new PondoknusaRequest(
      new Request('http://localhost/graphql', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ operationName: 'Hello' }),
      }),
    );

    const response = await handler(request);
    expect(await response.json()).toEqual({ data: { hello: 'world' } });
  });
});