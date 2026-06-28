import { describe, expect, it } from 'vitest';
import {
  Application,
  AuthServiceProvider,
  ConfigServiceProvider,
  DatabaseServiceProvider,
  setAuthApplication,
  setRouteApplication,
} from '@tyravel/core';
import { TestCase, withTyravelTest } from '@tyravel/testing';

class HeadlessApiTest extends TestCase {
  protected createApplication() {
    return new Application(import.meta.dir + '/../..');
  }

  protected override providers() {
    return [ConfigServiceProvider, DatabaseServiceProvider, AuthServiceProvider];
  }

  protected override async configureApplication(app: Application): Promise<void> {
    process.env.DB_DATABASE = ':memory:';
    setRouteApplication(app);
    setAuthApplication(app);
    await import('../../src/routes/api.js');
    await import('../../src/routes/auth.js');
    await super.configureApplication(app);
  }
}

const t = withTyravelTest(HeadlessApiTest);

describe('headless API example', () => {
  it('returns the headless index payload', async () => {
    const response = await t.http.get('http://localhost/');
    await response.assertOk();
    await response.assertJson({ mode: 'headless' });
  });

  it('serves versioned API health', async () => {
    const response = await t.http.get('http://localhost/api/v1/health');
    await response.assertOk();
    await response.assertJson({ status: 'ok' });
  });

  it('requires auth for protected posts', async () => {
    const response = await t.http.get('http://localhost/api/v1/posts');
    expect(response.status()).toBe(401);
  });
});