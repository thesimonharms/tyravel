import { Route } from '@pondoknusa/core';
import { ArrayStore } from '@pondoknusa/cache';
import {
  createGraphQLHandler,
  createOperationRegistry,
  defineSchema,
  defineType,
} from '@pondoknusa/graphql';
import { Document } from '../models/document.js';

const cache = new ArrayStore();

const schema = defineSchema({
  Query: {
    hello: {
      resolve: () => 'Pondoknusa RAG',
    },
    documents: {
      resolve: async () => Document.query().limit(10).get(),
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
      content: {
        resolve: (parent) => (parent as { content: string }).content,
      },
    }),
  },
});

const operations = createOperationRegistry([
  {
    name: 'Hello',
    type: 'query',
    document: 'query Hello { hello }',
  },
  {
    name: 'Documents',
    type: 'query',
    document: 'query Documents { documents { id source content } }',
  },
]);

export function registerGraphQLRoutes(): void {
  Route.post('/graphql', createGraphQLHandler({
    schema,
    operations,
    cache,
    defaultCacheTtl: 30,
  }));

  Route.get('/graphql', createGraphQLHandler({
    schema,
    operations,
    cache,
    defaultCacheTtl: 30,
  }));
}