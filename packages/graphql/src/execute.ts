import type { CacheStore } from '@pondoknusa/cache';
import { GraphQLError } from './errors.js';
import { buildGraphQLCacheKey, rememberGraphQLResponse } from './cache.js';
import { parseQuery, resolveArgumentValues } from './parse-query.js';
import type { GraphQLOperationRegistry } from './operations.js';
import type { GraphQLSchema } from './schema.js';
import type {
  ExecuteGraphQLOptions,
  FieldSelection,
  GraphQLContext,
  GraphQLExecutionResult,
  GraphQLFieldDefinition,
  GraphQLFormattedError,
  ParsedOperation,
  SelectionSet,
} from './types.js';

export async function executeNamedOperation(
  registry: GraphQLOperationRegistry,
  operationName: string,
  options: Omit<ExecuteGraphQLOptions, 'document' | 'operationName'>,
): Promise<GraphQLExecutionResult> {
  const operation = registry.get(operationName);
  if (!operation) {
    return {
      data: null,
      errors: [new GraphQLError(`Unknown operation [${operationName}].`).format()],
    };
  }

  return executeGraphQL({
    ...options,
    document: operation.document,
    operationName: operation.name,
  });
}

export async function executeGraphQL(options: ExecuteGraphQLOptions): Promise<GraphQLExecutionResult> {
  const payload = {
    query: options.document,
    operationName: options.operationName,
    variables: options.variables,
  };

  const run = async (): Promise<GraphQLExecutionResult> => {
    if (!options.document?.trim()) {
      return {
        data: null,
        errors: [new GraphQLError('Missing GraphQL document.').format()],
      };
    }

    try {
      const parsed = parseQuery(options.document);
      if (options.operationName && parsed.name && parsed.name !== options.operationName) {
        return {
          data: null,
          errors: [
            new GraphQLError(
              `Operation name mismatch: expected [${options.operationName}] but document declares [${parsed.name}].`,
            ).format(),
          ],
        };
      }

      const { data, errors } = await executeOperation(parsed, options.schema, {
        variables: options.variables ?? {},
        context: options.context ?? {},
        cache: options.cache,
      });

      return errors?.length ? { data, errors } : { data };
    } catch (error) {
      if (error instanceof GraphQLError) {
        return { data: null, errors: [error.format()] };
      }
      return {
        data: null,
        errors: [new GraphQLError(error instanceof Error ? error.message : String(error)).format()],
      };
    }
  };

  if (!options.cache) {
    return run();
  }

  const ttl = options.defaultCacheTtl ?? 60;
  return rememberGraphQLResponse(
    options.cache,
    buildGraphQLCacheKey(payload),
    ttl,
    run,
  );
}

async function executeOperation(
  operation: ParsedOperation,
  schema: GraphQLSchema,
  options: {
    variables: Record<string, unknown>;
    context: GraphQLContext;
    cache?: CacheStore;
  },
): Promise<{ data: Record<string, unknown>; errors?: GraphQLFormattedError[] }> {
  const rootFields = schema.rootFields(operation.type);
  const result: Record<string, unknown> = {};
  const errors: GraphQLFormattedError[] = [];

  for (const field of operation.selectionSet.fields) {
    const responseKey = field.alias ?? field.name;
    try {
      result[responseKey] = await executeRootField(
        field,
        rootFields[field.name],
        schema,
        options,
      );
    } catch (error) {
      errors.push(formatExecutionError(error, [responseKey]));
    }
  }

  return errors.length > 0 ? { data: result, errors } : { data: result };
}

async function executeRootField(
  field: FieldSelection,
  definition: GraphQLFieldDefinition | undefined,
  schema: GraphQLSchema,
  options: {
    variables: Record<string, unknown>;
    context: GraphQLContext;
    cache?: CacheStore;
  },
): Promise<unknown> {
  if (!definition) {
    throw new GraphQLError(`Unknown field [${field.name}].`);
  }

  const args = resolveArgumentValues(field.args, options.variables) as Record<string, unknown>;
  const responseKey = field.alias ?? field.name;
  return resolveFieldValue(
    null,
    definition,
    args,
    options,
    schema,
    field.selectionSet,
    field.name,
    [responseKey],
  );
}

async function resolveFieldValue(
  parent: unknown,
  definition: GraphQLFieldDefinition | undefined,
  args: Record<string, unknown>,
  options: {
    variables: Record<string, unknown>;
    context: GraphQLContext;
    cache?: CacheStore;
  },
  schema: GraphQLSchema,
  selectionSet: SelectionSet | undefined,
  fieldName: string,
  path: Array<string | number>,
): Promise<unknown> {
  let value: unknown;

  if (definition) {
    value = await resolveWithCache(parent, definition, args, options, path);
  } else if (parent !== null && parent !== undefined && typeof parent === 'object') {
    value = (parent as Record<string, unknown>)[fieldName];
  } else {
    value = parent;
  }

  if (!selectionSet || value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    const results: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      results.push(
        await resolveSelectionSet(
          value[index],
          selectionSet,
          schema,
          options,
          [...path, index],
        ),
      );
    }
    return results;
  }

  return resolveSelectionSet(value, selectionSet, schema, options, path);
}

async function resolveWithCache(
  parent: unknown,
  definition: GraphQLFieldDefinition,
  args: Record<string, unknown>,
  options: {
    variables: Record<string, unknown>;
    context: GraphQLContext;
    cache?: CacheStore;
  },
  path: Array<string | number>,
): Promise<unknown> {
  const execute = () => definition.resolve(parent, args, options.context);

  if (!definition.cache || !options.cache) {
    return execute();
  }

  const cacheKey = definition.cache.key
    ? `graphql:field:${definition.cache.key(args, options.context)}`
    : `graphql:field:${path.join('.')}:${JSON.stringify(args)}`;

  const cached = await options.cache.get(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const value = await execute();
  await options.cache.put(cacheKey, value, definition.cache.ttl);
  return value;
}

async function resolveSelectionSet(
  parent: unknown,
  selectionSet: SelectionSet,
  schema: GraphQLSchema,
  options: {
    variables: Record<string, unknown>;
    context: GraphQLContext;
    cache?: CacheStore;
  },
  path: Array<string | number>,
): Promise<unknown> {
  if (parent === null || parent === undefined) {
    return parent;
  }

  const object: Record<string, unknown> = {};
  const typeName = inferTypeName(parent);
  const typeFields = typeName ? schema.typeFields(typeName) : undefined;

  for (const field of selectionSet.fields) {
    const responseKey = field.alias ?? field.name;
    const childPath = [...path, responseKey];
    const fieldDefinition = typeFields?.[field.name];
    const args = resolveArgumentValues(field.args, options.variables) as Record<string, unknown>;

    try {
      object[responseKey] = await resolveFieldValue(
        parent,
        fieldDefinition,
        args,
        options,
        schema,
        field.selectionSet,
        field.name,
        childPath,
      );
    } catch (error) {
      throw new GraphQLError(
        error instanceof Error ? error.message : String(error),
        childPath,
      );
    }
  }

  return object;
}

function inferTypeName(parent: unknown): string | undefined {
  if (!parent || typeof parent !== 'object') {
    return undefined;
  }

  const typename = (parent as Record<string, unknown>).__typename;
  return typeof typename === 'string' ? typename : undefined;
}

function formatExecutionError(
  error: unknown,
  path: Array<string | number>,
): GraphQLFormattedError {
  if (error instanceof GraphQLError) {
    return error.format();
  }

  return new GraphQLError(
    error instanceof Error ? error.message : String(error),
    path,
  ).format();
}