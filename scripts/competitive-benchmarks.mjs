/**
 * Apples-to-apples JSON throughput baselines against other Node HTTP frameworks.
 * Each server exposes GET /bench -> { ok: true } on an ephemeral port.
 */

import { createServer as createNodeHttpServer } from 'node:http';
import { performance } from 'node:perf_hooks';

const QUICK = process.env.BENCHMARK_QUICK === '1';
const HTTP_DEFAULTS = {
  warmup: QUICK ? 10 : 200,
  requests: QUICK ? 50 : 2_000,
  concurrency: QUICK ? 5 : 50,
};

async function listenNodeServer(server, hostname, port) {
  await new Promise((resolve, reject) => {
    server.listen(port, hostname, () => resolve());
    server.on('error', reject);
  });
}

function resolveNodeAddress(server, fallbackHost) {
  const address = server.address();
  if (typeof address === 'object' && address) {
    return { hostname: address.address, port: address.port };
  }
  return { hostname: fallbackHost, port: 0 };
}

async function closeNodeServer(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

export async function runFetchJsonBenchmark({
  name,
  label,
  category = 'compare',
  warmup = HTTP_DEFAULTS.warmup,
  requests = HTTP_DEFAULTS.requests,
  concurrency = HTTP_DEFAULTS.concurrency,
  createServer,
}) {
  const server = await createServer();

  try {
    const url = `http://${server.hostname}:${server.port}/bench`;

    const runOnce = async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`${label} failed with status ${response.status}`);
      }
      await response.arrayBuffer();
    };

    for (let i = 0; i < warmup; i++) {
      await runOnce();
    }

    const start = performance.now();
    for (let offset = 0; offset < requests; offset += concurrency) {
      const batch = Math.min(concurrency, requests - offset);
      await Promise.all(Array.from({ length: batch }, () => runOnce()));
    }
    const elapsedMs = performance.now() - start;

    return {
      name,
      label,
      category,
      unit: 'req/s',
      samples: requests,
      elapsedMs,
      value: Math.round((requests / elapsedMs) * 1000),
    };
  } finally {
    await server.close();
  }
}

async function createExpressServer() {
  const express = (await import('express')).default;
  const app = express();

  app.get('/bench', (_request, response) => {
    response.json({ ok: true });
  });

  const server = createNodeHttpServer(app);
  await listenNodeServer(server, '127.0.0.1', 0);
  const { hostname, port } = resolveNodeAddress(server, '127.0.0.1');

  return {
    hostname,
    port,
    close: () => closeNodeServer(server),
  };
}

async function createFastifyServer() {
  const Fastify = (await import('fastify')).default;
  const app = Fastify({ logger: false });

  app.get('/bench', async () => ({ ok: true }));

  const address = await app.listen({ port: 0, host: '127.0.0.1' });
  const port = Number(String(address).split(':').pop());

  return {
    hostname: '127.0.0.1',
    port,
    close: () => app.close(),
  };
}

async function createHonoServer() {
  const { Hono } = await import('hono');
  const { serve } = await import('@hono/node-server');
  const app = new Hono();

  app.get('/bench', (context) => context.json({ ok: true }));

  const { server, hostname, port } = await new Promise((resolve, reject) => {
    const started = serve(
      {
        fetch: app.fetch,
        hostname: '127.0.0.1',
        port: 0,
      },
      (address) => {
        resolve({
          server: started,
          hostname: address.address,
          port: address.port,
        });
      },
    );
    started.on('error', reject);
  });

  return {
    hostname,
    port,
    close: () => closeNodeServer(server),
  };
}

export async function measureCompareTyravel(httpOptions, measureHttp) {
  const result = await measureHttp(httpOptions);
  return {
    ...result,
    name: 'compare.tyravel',
    label: 'Compare: Tyravel JSON (/bench)',
    category: 'compare',
  };
}

export async function measureCompareExpress(httpOptions) {
  return runFetchJsonBenchmark({
    name: 'compare.express',
    label: 'Compare: Express JSON (/bench)',
    createServer: createExpressServer,
    ...httpOptions,
  });
}

export async function measureCompareFastify(httpOptions) {
  return runFetchJsonBenchmark({
    name: 'compare.fastify',
    label: 'Compare: Fastify JSON (/bench)',
    createServer: createFastifyServer,
    ...httpOptions,
  });
}

export async function measureCompareHono(httpOptions) {
  return runFetchJsonBenchmark({
    name: 'compare.hono',
    label: 'Compare: Hono JSON (/bench)',
    createServer: createHonoServer,
    ...httpOptions,
  });
}

export async function runCompetitiveBenchmarks(httpOptions, measureHttp) {
  const runners = [
    () => measureCompareTyravel(httpOptions, measureHttp),
    () => measureCompareExpress(httpOptions),
    () => measureCompareFastify(httpOptions),
    () => measureCompareHono(httpOptions),
  ];

  const results = [];
  for (const run of runners) {
    results.push(await run());
  }

  return results;
}