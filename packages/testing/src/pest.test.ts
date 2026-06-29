import { describe, expect, it, test } from 'vitest';
import { Application, Route, setRouteApplication } from '@pondoknusa/core';
import { Response } from '@pondoknusa/http';
import { TestCase } from './test-case.js';
import { dataset, uses } from './pest.js';

class HomeTest extends TestCase {
  protected createApplication(): Application {
    return new Application('/tmp/pondoknusa-pest');
  }

  protected override async configureApplication(app: Application): Promise<void> {
    setRouteApplication(app);
    Route.get('/hello', () => Response.json({ hello: 'world' }));
  }
}

describe('pest helpers', () => {
  const t = uses(HomeTest);

  test('uses() boots a TestCase like withPondoknusaTest', async () => {
    const response = await t.http.get('http://localhost/hello');
    await response.assertJson({ hello: 'world' });
  });

  it('formats dataset rows for table-driven tests', () => {
    expect(dataset([{ name: 'Ada', id: 1 }])).toEqual([['name: Ada, id: 1', { name: 'Ada', id: 1 }]]);
  });
});