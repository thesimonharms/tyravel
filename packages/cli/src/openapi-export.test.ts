import { describe, expect, it } from 'vitest';
import { routesToOpenApi } from './openapi-export.js';

describe('routesToOpenApi', () => {
  it('converts route list entries to OpenAPI paths', () => {
    const document = routesToOpenApi([
      {
        method: 'GET',
        uri: 'api/v1/health',
        middleware: ['throttle:api'],
        action: 'Closure',
      },
      {
        method: 'POST',
        uri: 'api/v1/login',
        name: 'api.login',
        middleware: ['guest'],
        action: 'AuthController@login',
      },
    ]);

    expect(document.openapi).toBe('3.0.3');
    const paths = document.paths as Record<string, Record<string, unknown>>;
    expect(paths['/api/v1/health']?.get).toBeDefined();
    expect(paths['/api/v1/login']?.post).toMatchObject({
      operationId: 'api.login',
      tags: ['v1'],
    });
  });
});