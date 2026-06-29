import { isJsonResource, isResourceCollection } from './api-resource.js';
import { Response } from './response.js';
import type { PondoknusaRequest } from './request.js';

const WebResponse = globalThis.Response;

export async function resolveHttpResult(
  result: unknown,
  request?: PondoknusaRequest,
): Promise<Response> {
  if (result instanceof WebResponse) {
    return result;
  }

  if (result === undefined || result === null) {
    return Response.noContent();
  }

  if (isJsonResource(result) || isResourceCollection(result)) {
    return Response.json(await result.resolve(request));
  }

  return Response.json(result);
}