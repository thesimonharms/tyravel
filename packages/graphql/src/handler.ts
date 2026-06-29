import type { CacheStore } from '@pondoknusa/cache';
import { Response } from '@pondoknusa/http';
import type { PondoknusaRequest } from '@pondoknusa/http';
import type { RouteHandler } from '@pondoknusa/http';
import { executeGraphQL, executeNamedOperation } from './execute.js';
import type { GraphQLOperationRegistry } from './operations.js';
import type { GraphQLSchema } from './schema.js';
import type { GraphQLContext, GraphQLRequestPayload } from './types.js';

export interface GraphQLHandlerOptions {
  schema: GraphQLSchema;
  operations?: GraphQLOperationRegistry;
  cache?: CacheStore;
  defaultCacheTtl?: number;
  context?: (request: PondoknusaRequest) => GraphQLContext | Promise<GraphQLContext>;
}

export function createGraphQLHandler(options: GraphQLHandlerOptions): RouteHandler {
  return async (request) => {
    const payload = await readGraphQLPayload(request);
    const context = options.context ? await options.context(request) : { request };

    const executionOptions = {
      schema: options.schema,
      document: payload.query,
      operationName: payload.operationName,
      variables: payload.variables,
      context,
      cache: options.cache,
      defaultCacheTtl: options.defaultCacheTtl,
    };

    const result = payload.operationName && options.operations?.has(payload.operationName)
      ? await executeNamedOperation(options.operations, payload.operationName, {
          schema: options.schema,
          variables: payload.variables,
          context,
          cache: options.cache,
          defaultCacheTtl: options.defaultCacheTtl,
        })
      : await executeGraphQL(executionOptions);

    return Response.json(result);
  };
}

async function readGraphQLPayload(request: PondoknusaRequest): Promise<GraphQLRequestPayload> {
  if (request.method === 'GET') {
    const query = request.query('query');
    const operationName = request.query('operationName');
    const variablesRaw = request.query('variables');
    return {
      query,
      operationName,
      variables: variablesRaw ? JSON.parse(variablesRaw) as Record<string, unknown> : undefined,
    };
  }

  const body = await request.json() as GraphQLRequestPayload;
  return {
    query: body.query,
    operationName: body.operationName,
    variables: body.variables ?? {},
  };
}