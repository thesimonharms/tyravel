import { describe, expect, it } from 'vitest';
import { PondoknusaRequest } from './request.js';
import { Response } from './response.js';
import { createRoutePipelineRunner } from './route-pipeline.js';

describe('RoutePipelineRunner', () => {
  it('runs middleware in order then the handler', async () => {
    const order: string[] = [];
    const runner = createRoutePipelineRunner(
      () => {
        order.push('handler');
        return Response.text('ok');
      },
      [
        async (_request, next) => {
          order.push('mw-1');
          return next();
        },
        async (_request, next) => {
          order.push('mw-2');
          return next();
        },
      ],
    );

    const response = await runner.run(
      new PondoknusaRequest(new Request('http://localhost/')),
    );

    expect(order).toEqual(['mw-1', 'mw-2', 'handler']);
    expect(await response.text()).toBe('ok');
  });

  it('invokes the handler directly when middleware is empty', async () => {
    const runner = createRoutePipelineRunner(
      () => Response.json({ ok: true }),
      [],
    );

    const response = await runner.run(
      new PondoknusaRequest(new Request('http://localhost/api')),
    );

    expect(await response.json()).toEqual({ ok: true });
  });
});