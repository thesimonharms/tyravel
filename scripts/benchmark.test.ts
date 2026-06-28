import { describe, expect, it } from 'vitest';
import {
  measureBootCold,
  measureHttp,
  measureMiddlewareStack,
  measureOrm,
  measureViewCompile,
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

  it('measures middleware stack throughput', async () => {
    const result = await measureMiddlewareStack({ warmup: 5, requests: 10, concurrency: 5 });
    expect(result.name).toBe('middleware.stack');
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

    expect(report.results).toHaveLength(5);
    for (const result of report.results) {
      expect(result.value).toBeGreaterThan(0);
    }
  });
});