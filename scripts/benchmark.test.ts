import { describe, expect, it } from 'vitest';
import {
  measureBootCold,
  measureHttp,
  measureHttpJsonFast,
  measureHttpSsr,
  measureMiddlewareStack,
  measureOrm,
  measureOrmPruned,
  measureSessionAuth,
  measureViewCompile,
  measureViewRender,
  runBenchmarks,
} from './benchmark.mjs';

describe('benchmarks', () => {
  it('measures HTTP throughput', async () => {
    const result = await measureHttp({ warmup: 5, requests: 20, concurrency: 5 });
    expect(result.name).toBe('http.json');
    expect(result.value).toBeGreaterThan(0);
  });

  it('measures ORM throughput', async () => {
    const result = await measureOrm({ warmup: 2, iterations: 10 });
    expect(result.name).toBe('orm.select');
    expect(result.value).toBeGreaterThan(0);
  });

  it('measures pruned ORM throughput on wide rows', async () => {
    const result = await measureOrmPruned({ warmup: 2, iterations: 10 });
    expect(result.name).toBe('orm.select.pruned');
    expect(result.value).toBeGreaterThan(0);
  });

  it('measures view compile throughput', () => {
    const result = measureViewCompile({ warmup: 2, iterations: 10 });
    expect(result.name).toBe('view.compile');
    expect(result.value).toBeGreaterThan(0);
  });

  it('measures cold boot latency', async () => {
    const result = await measureBootCold({ iterations: 2 });
    expect(result.name).toBe('boot.cold');
    expect(result.value).toBeGreaterThan(0);
  });

  it('measures JSON fast-path throughput', async () => {
    const result = await measureHttpJsonFast({ warmup: 5, requests: 10, concurrency: 5 });
    expect(result.name).toBe('http.json.fast');
    expect(result.value).toBeGreaterThan(0);
  });

  it('measures middleware stack throughput', async () => {
    const result = await measureMiddlewareStack({ warmup: 5, requests: 10, concurrency: 5 });
    expect(result.name).toBe('middleware.stack');
    expect(result.value).toBeGreaterThan(0);
  });

  it('measures session auth throughput', async () => {
    const result = await measureSessionAuth({ warmup: 3, requests: 10, concurrency: 5 });
    expect(result.name).toBe('session.auth');
    expect(result.value).toBeGreaterThan(0);
  });

  it('measures HTTP SSR throughput', async () => {
    const result = await measureHttpSsr({ warmup: 3, requests: 10, concurrency: 5 });
    expect(result.name).toBe('http.ssr');
    expect(result.value).toBeGreaterThan(0);
  });

  it('measures view render throughput', async () => {
    const result = await measureViewRender({ warmup: 2, iterations: 5 });
    expect(result.name).toBe('view.render');
    expect(result.value).toBeGreaterThan(0);
  });

  it('runs the full benchmark report', async () => {
    const report = await runBenchmarks({
      boot: { iterations: 2 },
      http: { warmup: 5, requests: 10, concurrency: 5 },
      middleware: { warmup: 5, requests: 10, concurrency: 5 },
      orm: { warmup: 2, iterations: 5 },
      views: { warmup: 2, iterations: 5 },
    });

    expect(report.results).toHaveLength(14);
    expect(report.competitive).toHaveLength(4);

    for (const result of report.results) {
      expect(result.value).toBeGreaterThan(0);
    }

    for (const result of report.competitive) {
      expect(result.name).toMatch(/^compare\./);
      expect(result.value).toBeGreaterThan(0);
    }
  });
});