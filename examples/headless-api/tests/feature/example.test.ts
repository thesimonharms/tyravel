import { describe, expect, it } from 'vitest';
import { Application, ConfigServiceProvider, DatabaseServiceProvider, setRouteApplication } from '@tyravel/core';
import { TestCase, withTyravelTest } from '@tyravel/testing';

class ExampleTest extends TestCase {
  protected createApplication() {
    return new Application(import.meta.dir + '/..');
  }

  protected override providers() {
    return [ConfigServiceProvider, DatabaseServiceProvider];
  }

  protected override async configureApplication(app: Application): Promise<void> {
    process.env.DB_DATABASE = ':memory:';
    setRouteApplication(app);
    await import('../src/routes/api.js');
    await super.configureApplication(app);
  }
}

const t = withTyravelTest(ExampleTest);

describe('headless API', () => {
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
});
