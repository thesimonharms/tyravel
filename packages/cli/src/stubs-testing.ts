
export function viewTypesWorkflow(): string {
  return `name: View prop types

on:
  pull_request:
    paths:
      - 'resources/views/**'
      - 'resources/views/**/*.tyr'
      - 'src/**/*.tyr.ts'

jobs:
  view-types:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '26'
          cache: npm
      - run: npm ci
      - run: npx pondoknusa view:types --check
`;
}

export function projectVitestConfig(): string {
  return `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
`;
}

export interface FeatureTestStubOptions {
  feature?: boolean;
  hasAuth?: boolean;
}

export function featureTestStub(className: string, options: FeatureTestStubOptions = {}): string {
  if (!options.feature) {
    return `import { describe, it } from 'vitest';
import { Application } from '@pondoknusa/core';
import { TestCase, withPondoknusaTest } from '@pondoknusa/testing';
import '../src/routes/web.js';

class ${className} extends TestCase {
  protected createApplication() {
    return new Application(import.meta.dir + '/..');
  }
}

const t = withPondoknusaTest(${className});

describe('feature / example', () => {
  it('responds on the home route', async () => {
    const response = await t.http.get('http://localhost/');
    await response.assertOk();
  });
});
`;
  }

  const authProvider = options.hasAuth ? '      AuthServiceProvider,\n' : '';

  const actingAsExample = options.hasAuth
    ? `
  it('posts with CSRF and actingAs when authenticated', async () => {
    const user = { id: 1, email: 'ada@example.com' };
    const response = await t.http
      .actingAs(user)
      .withCsrf()
      .post('http://localhost/api/example', { json: { ok: true } });
    expect([200, 201, 404, 419]).toContain(response.status);
  });`
    : `
  it('posts with CSRF for mutating routes', async () => {
    const response = await t.http
      .withCsrf()
      .post('http://localhost/api/example', { json: { ok: true } });
    expect([200, 201, 404, 419]).toContain(response.status);
  });`;

  return `import { describe, expect, it } from 'vitest';
import {
  Application,
  AuthServiceProvider,
  ConfigServiceProvider,
  DatabaseServiceProvider,
  EventServiceProvider,
  QueueServiceProvider,
  ViewServiceProvider,
  setRouteApplication,
} from '@pondoknusa/core';
import { DatabaseManager, Migrator } from '@pondoknusa/database';
import { TestCase, withPondoknusaTest } from '@pondoknusa/testing';

class ${className} extends TestCase {
  protected usesDatabaseTransactions = true;

  protected createApplication() {
    return new Application(import.meta.dir + '/..');
  }

  protected override providers() {
    return [
      ConfigServiceProvider,
      DatabaseServiceProvider,
      QueueServiceProvider,
      EventServiceProvider,
      ViewServiceProvider,
${authProvider}    ];
  }

  protected override async configureApplication(app: Application): Promise<void> {
    process.env.DB_DATABASE = ':memory:';
    process.env.MAIL_MAILER = 'array';
    process.env.QUEUE_CONNECTION = 'sync';
    setRouteApplication(app);
    await import('../src/routes/web.js');
    await super.configureApplication(app);
  }

  protected override async setUp(): Promise<void> {
    await super.setUp();
    const db = this.app.make(DatabaseManager);
    const migrator = new Migrator(db.connection(), this.app.migrationPaths());
    await migrator.run();
    this.http = this.http.withCsrf();
  }
}

const t = withPondoknusaTest(${className});

describe('feature / ${className}', () => {
  it('responds on the home route', async () => {
    const response = await t.http.get('http://localhost/');
    await response.assertOk();
  });${actingAsExample}
});
`;
}