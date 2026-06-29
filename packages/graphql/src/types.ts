import type { CacheStore } from '@pondoknusa/cache';
import type { GraphQLSchema } from './schema.js';

export type GraphQLOperationType = 'query' | 'mutation';

export type GraphQLScalar = 'String' | 'Int' | 'Float' | 'Boolean' | 'ID';

export interface GraphQLContext {
  request?: unknown;
  [key: string]: unknown;
}

export type GraphQLResolver<TArgs = Record<string, unknown>> = (
  parent: unknown,
  args: TArgs,
  context: GraphQLContext,
) => unknown | Promise<unknown>;

export interface GraphQLFieldCacheOptions<TArgs = Record<string, unknown>> {
  ttl: number;
  key?: (args: TArgs, context: GraphQLContext) => string;
}

export interface GraphQLFieldDefinition<TArgs = Record<string, unknown>> {
  type?: string;
  args?: Record<string, string>;
  resolve: GraphQLResolver<TArgs>;
  cache?: GraphQLFieldCacheOptions<TArgs>;
}

export interface GraphQLTypeDefinition {
  fields: Record<string, GraphQLFieldDefinition>;
}

export interface GraphQLSchemaDefinition {
  Query: Record<string, GraphQLFieldDefinition>;
  Mutation?: Record<string, GraphQLFieldDefinition>;
  types?: Record<string, GraphQLTypeDefinition>;
}

export interface FieldSelection {
  name: string;
  alias?: string;
  args?: Record<string, unknown>;
  selectionSet?: SelectionSet;
}

export interface SelectionSet {
  fields: FieldSelection[];
}

export interface ParsedOperation {
  type: GraphQLOperationType;
  name?: string;
  variableDefinitions: Record<string, string>;
  selectionSet: SelectionSet;
}

export interface GraphQLOperationDefinition {
  name: string;
  type: GraphQLOperationType;
  document: string;
}

export interface GraphQLRequestPayload {
  query?: string;
  operationName?: string;
  variables?: Record<string, unknown>;
}

export interface GraphQLExecutionResult {
  data?: Record<string, unknown> | null;
  errors?: GraphQLFormattedError[];
}

export interface GraphQLFormattedError {
  message: string;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}

export interface ExecuteGraphQLOptions {
  schema: GraphQLSchema;
  document?: string;
  operationName?: string;
  variables?: Record<string, unknown>;
  context?: GraphQLContext;
  cache?: CacheStore;
  defaultCacheTtl?: number;
}