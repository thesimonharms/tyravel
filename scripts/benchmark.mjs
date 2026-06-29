#!/usr/bin/env node
/**
 * Pondoknusa performance benchmarks.
 *
 * Usage:
 *   npm run benchmark
 *   npm run benchmark -- --json
 *   BENCHMARK_QUICK=1 npm run benchmark
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import {
  Application,
  ConfigServiceProvider,
  HttpKernel,
  Route,
  setRouteApplication,
  setViewApplication,
  serve,
  View,
  ViewServiceProvider,
} from '@pondoknusa/core';
import { Model, SqliteConnection } from '@pondoknusa/database';
import { Response } from '@pondoknusa/http';
import { compile, ViewEngine } from '@pondoknusa/views';
import { runCompetitiveBenchmarks } from './competitive-benchmarks.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const QUICK = process.env.BENCHMARK_QUICK === '1';

function prepareBenchmarkRouter(router, options = {}) {
  const {
    jsonFastPath = true,
    requestPooling = false,
    early404 = false,
  } = options;

  router.warmRouteCache();
  router.setJsonFastPath(jsonFastPath);
  if (requestPooling) {
    router.setRequestPooling(true);
  }
  if (early404) {
    router.setEarly404(true);
  }
}

const DEFAULTS = {
  http: { warmup: QUICK ? 10 : 200, requests: QUICK ? 50 : 2_000, concurrency: QUICK ? 5 : 50 },
  middleware: { warmup: QUICK ? 10 : 100, requests: QUICK ? 50 : 1_000, concurrency: QUICK ? 5 : 25 },
  orm: { warmup: QUICK ? 5 : 50, iterations: QUICK ? 20 : 1_000 },
  views: { warmup: QUICK ? 5 : 50, iterations: QUICK ? 20 : 500 },
  boot: { iterations: QUICK ? 3 : 10 },
};

export async function measureHttpJsonFast({
  warmup = DEFAULTS.http.warmup,
  requests = DEFAULTS.http.requests,
  concurrency = DEFAULTS.http.concurrency,
} = {}) {
  const { withMiddlewareMeta } = await import('@pondoknusa/http');

  const app = new Application();
  setRouteApplication(app);

  app.use(
    withMiddlewareMeta(async (_request, next) => next(), { tag: 'session' }),
  );
  Route.get('/api/v1/health', () => Response.json({ status: 'ok' }));
  prepareBenchmarkRouter(app.router(), { requestPooling: true });

  const kernel = new HttpKernel(app);
  const server = await serve(kernel, { port: 0, hostname: '127.0.0.1', quiet: true });
  const url = `http://${server.hostname}:${server.port}/api/v1/health`;

  const runOnce = async () => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`JSON fast-path benchmark failed with status ${response.status}`);
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
  await server.close();

  return {
    name: 'http.json.fast',
    label: 'HTTP JSON fast path (session skipped, request pool)',
    unit: 'req/s',
    samples: requests,
    elapsedMs,
    value: Math.round((requests / elapsedMs) * 1000),
  };
}

export async function measureHttp({
  warmup = DEFAULTS.http.warmup,
  requests = DEFAULTS.http.requests,
  concurrency = DEFAULTS.http.concurrency,
} = {}) {
  const app = new Application();
  setRouteApplication(app);
  Route.get('/bench', () => Response.json({ ok: true }));
  prepareBenchmarkRouter(app.router());
  const kernel = new HttpKernel(app);
  const server = await serve(kernel, { port: 0, hostname: '127.0.0.1', quiet: true });
  const url = `http://${server.hostname}:${server.port}/bench`;

  const runOnce = async () => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP benchmark failed with status ${response.status}`);
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
  await server.close();

  return {
    name: 'http.json',
    label: 'HTTP JSON responses',
    unit: 'req/s',
    samples: requests,
    elapsedMs,
    value: Math.round((requests / elapsedMs) * 1000),
  };
}

class BenchPost extends Model {
  static table = 'bench_posts';
}

export async function measureMiddlewareStack({
  warmup = DEFAULTS.middleware.warmup,
  requests = DEFAULTS.middleware.requests,
  concurrency = DEFAULTS.middleware.concurrency,
} = {}) {
  const app = new Application();
  setRouteApplication(app);

  app.middleware('mw-a', async (_request, next) => next());
  app.middleware('mw-b', async (_request, next) => next());
  app.middleware('mw-c', async (_request, next) => next());

  Route.middleware(['mw-a', 'mw-b', 'mw-c']).get('/mw', () => Response.json({ ok: true }));
  prepareBenchmarkRouter(app.router());

  const kernel = new HttpKernel(app);
  const server = await serve(kernel, { port: 0, hostname: '127.0.0.1', quiet: true });
  const url = `http://${server.hostname}:${server.port}/mw`;

  const runOnce = async () => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Middleware benchmark failed with status ${response.status}`);
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
  await server.close();

  return {
    name: 'middleware.stack',
    label: 'HTTP JSON with 3-middleware stack',
    unit: 'req/s',
    samples: requests,
    elapsedMs,
    value: Math.round((requests / elapsedMs) * 1000),
  };
}

export async function measureBootCold({
  iterations = DEFAULTS.boot.iterations,
} = {}) {
  const samples = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const app = new Application();
    setRouteApplication(app);
    Route.get('/boot', () => Response.json({ ok: true }));
    prepareBenchmarkRouter(app.router());
    const kernel = new HttpKernel(app);
    const server = await serve(kernel, { port: 0, hostname: '127.0.0.1', quiet: true });
    samples.push(performance.now() - start);
    await server.close();
  }

  const elapsedMs = samples.reduce((sum, value) => sum + value, 0);
  const averageMs = elapsedMs / samples.length;

  return {
    name: 'boot.cold',
    label: 'Cold boot to HTTP listen',
    unit: 'ms',
    samples: iterations,
    elapsedMs,
    value: Math.max(1, Math.round(averageMs)),
  };
}

export async function measureOrm({
  warmup = DEFAULTS.orm.warmup,
  iterations = DEFAULTS.orm.iterations,
} = {}) {
  const connection = await SqliteConnection.connect(':memory:');
  BenchPost.useConnection(connection);
  await connection.exec(`
    CREATE TABLE bench_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL
    )
  `);
  for (let i = 0; i < 100; i++) {
    await BenchPost.create({ title: `Post ${i}` });
  }

  const runOnce = async () => {
    const rows = await BenchPost.all();
    if (rows.length !== 100) {
      throw new Error(`ORM benchmark expected 100 rows, got ${rows.length}`);
    }
  };

  for (let i = 0; i < warmup; i++) {
    await runOnce();
  }

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    await runOnce();
  }
  const elapsedMs = performance.now() - start;
  await connection.close();

  return {
    name: 'orm.select',
    label: 'ORM select all (100 rows, SQLite memory)',
    unit: 'ops/s',
    samples: iterations,
    elapsedMs,
    value: Math.round((iterations / elapsedMs) * 1000),
  };
}

class WideBenchPost extends Model {
  static table = 'bench_wide_posts';
}

export async function measureOrmPruned({
  warmup = DEFAULTS.orm.warmup,
  iterations = DEFAULTS.orm.iterations,
} = {}) {
  const connection = await SqliteConnection.connect(':memory:');
  WideBenchPost.useConnection(connection);
  await connection.exec(`
    CREATE TABLE bench_wide_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      slug TEXT NOT NULL,
      meta_json TEXT NOT NULL,
      author TEXT NOT NULL,
      category TEXT NOT NULL,
      tags TEXT NOT NULL
    )
  `);

  for (let i = 0; i < 100; i++) {
    await WideBenchPost.create({
      title: `Post ${i}`,
      body: `Body ${i} `.repeat(40),
      excerpt: `Excerpt ${i}`,
      slug: `post-${i}`,
      meta_json: JSON.stringify({ featured: i % 2 === 0, views: i * 10 }),
      author: `Author ${i % 5}`,
      category: 'news',
      tags: 'alpha,beta,gamma',
    });
  }

  const runOnce = async () => {
    const rows = await WideBenchPost.select('id', 'title').getModels();
    if (rows.length !== 100) {
      throw new Error(`ORM pruned benchmark expected 100 rows, got ${rows.length}`);
    }
  };

  for (let i = 0; i < warmup; i++) {
    await runOnce();
  }

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    await runOnce();
  }
  const elapsedMs = performance.now() - start;
  await connection.close();

  return {
    name: 'orm.select.pruned',
    label: 'ORM select id+title (100 wide rows, SQLite memory)',
    unit: 'ops/s',
    samples: iterations,
    elapsedMs,
    value: Math.round((iterations / elapsedMs) * 1000),
  };
}

const VIEW_SOURCE = readFileSync(
  join(ROOT, 'examples/hello-world/resources/views/welcome.tyr'),
  'utf8',
);

const HELLO_WORLD_ROOT = join(ROOT, 'examples/hello-world');
const WELCOME_CONTEXT = {
  name: 'Benchmark',
  message: 'Tier 19 throughput check',
  tagline: 'Fast by default',
};

export async function measureViewRender({
  warmup = DEFAULTS.views.warmup,
  iterations = DEFAULTS.views.iterations,
} = {}) {
  const engine = new ViewEngine(HELLO_WORLD_ROOT, {
    path: 'resources/views',
    extension: '.tyr',
    compiled: false,
    validateProps: false,
  });

  const runOnce = async () => {
    const html = await engine.render('welcome', WELCOME_CONTEXT);
    if (!html.includes('Hello Benchmark')) {
      throw new Error('View render benchmark produced unexpected HTML');
    }
  };

  for (let i = 0; i < warmup; i++) {
    await runOnce();
  }

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    await runOnce();
  }
  const elapsedMs = performance.now() - start;

  return {
    name: 'view.render',
    label: 'Render welcome.tyr template',
    unit: 'ops/s',
    samples: iterations,
    elapsedMs,
    value: Math.round((iterations / elapsedMs) * 1000),
  };
}

export async function measureHttpSsr({
  warmup = DEFAULTS.http.warmup,
  requests = DEFAULTS.http.requests,
  concurrency = DEFAULTS.http.concurrency,
} = {}) {
  const app = new Application(HELLO_WORLD_ROOT);
  setRouteApplication(app);
  setViewApplication(app);

  const engine = new ViewEngine(HELLO_WORLD_ROOT, {
    path: 'resources/views',
    extension: '.tyr',
    compiled: false,
    validateProps: false,
  });
  app.instance('view', engine);

  Route.get('/', async () => Response.html(await View.render('welcome', WELCOME_CONTEXT)));
  prepareBenchmarkRouter(app.router());

  const kernel = new HttpKernel(app);
  const server = await serve(kernel, { port: 0, hostname: '127.0.0.1', quiet: true });
  const url = `http://${server.hostname}:${server.port}/`;

  const runOnce = async () => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`SSR benchmark failed with status ${response.status}`);
    }
    const html = await response.text();
    if (!html.includes('Hello Benchmark')) {
      throw new Error('SSR benchmark produced unexpected HTML');
    }
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
  await server.close();

  return {
    name: 'http.ssr',
    label: 'HTTP SSR welcome.tyr through HttpKernel',
    unit: 'req/s',
    samples: requests,
    elapsedMs,
    value: Math.round((requests / elapsedMs) * 1000),
  };
}

export async function measureSessionAuth({
  warmup = DEFAULTS.middleware.warmup,
  requests = DEFAULTS.middleware.requests,
  concurrency = DEFAULTS.middleware.concurrency,
} = {}) {
  const {
    AuthManager,
    Hasher,
    SessionGuard,
    MemorySessionStore,
    createAuthMiddleware,
    createStartSessionMiddleware,
  } = await import('@pondoknusa/auth');

  class BenchUser {
    constructor(id, passwordHash) {
      this.id = id;
      this.passwordHash = passwordHash;
    }

    getAuthIdentifier() {
      return this.id;
    }

    getAuthPassword() {
      return this.passwordHash;
    }
  }

  class BenchProvider {
    constructor(hasher) {
      this.hasher = hasher;
    }

    async retrieveById(id) {
      if (Number(id) === 1) {
        return new BenchUser(1, this.hasher.make('secret'));
      }
      return null;
    }

    async retrieveByCredentials(credentials) {
      if (credentials.email === 'bench@pondoknusa.dev') {
        return new BenchUser(1, this.hasher.make('secret'));
      }
      return null;
    }

    async validateCredentials(user, credentials) {
      return this.hasher.check(credentials.password ?? '', user.getAuthPassword());
    }
  }

  const sessionConfig = {
    cookie: 'pondoknusa_session',
    lifetimeMinutes: 120,
    table: 'sessions',
  };
  const hasher = new Hasher();
  const provider = new BenchProvider(hasher);
  const store = new MemorySessionStore();
  const guard = new SessionGuard('web', provider, store, sessionConfig);
  const auth = new AuthManager(
    {
      defaults: { guard: 'web' },
      guards: { web: { driver: 'session', provider: 'users' } },
      providers: { users: { model: 'BenchUser' } },
      session: sessionConfig,
    },
    { web: () => guard },
    'web',
  );

  const app = new Application();
  setRouteApplication(app);
  prepareBenchmarkRouter(app.router(), { jsonFastPath: false });
  app.use(createStartSessionMiddleware(auth));
  app.middleware('auth', createAuthMiddleware(auth));
  Route.post('/login', async (request) => {
    const body = await request.json();
    const ok = await auth.attempt(body);
    return Response.json({ ok });
  });
  Route.middleware('auth').get('/me', (request) => {
    const user = request.user;
    const id = user && typeof user.getAuthIdentifier === 'function'
      ? user.getAuthIdentifier()
      : null;
    return Response.json({ id });
  });

  const kernel = new HttpKernel(app);
  const server = await serve(kernel, { port: 0, hostname: '127.0.0.1', quiet: true });
  const baseUrl = `http://${server.hostname}:${server.port}`;

  const loginResponse = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'bench@pondoknusa.dev', password: 'secret' }),
  });
  if (!loginResponse.ok) {
    throw new Error(`Session auth benchmark login failed with status ${loginResponse.status}`);
  }

  const cookie = loginResponse.headers.get('set-cookie') ?? '';
  const runOnce = async () => {
    const response = await fetch(`${baseUrl}/me`, { headers: { cookie } });
    if (!response.ok) {
      throw new Error(`Session auth benchmark failed with status ${response.status}`);
    }
    const body = await response.json();
    if (body.id !== 1) {
      throw new Error(`Session auth benchmark expected user id 1, got ${body.id}`);
    }
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
  await server.close();

  return {
    name: 'session.auth',
    label: 'HTTP JSON with session + auth middleware',
    unit: 'req/s',
    samples: requests,
    elapsedMs,
    value: Math.round((requests / elapsedMs) * 1000),
  };
}

export function measureViewCompile({
  warmup = DEFAULTS.views.warmup,
  iterations = DEFAULTS.views.iterations,
} = {}) {
  const runOnce = () => {
    const template = compile(VIEW_SOURCE);
    if (!template.layout) {
      throw new Error('View compile benchmark produced an invalid template');
    }
  };

  for (let i = 0; i < warmup; i++) {
    runOnce();
  }

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    runOnce();
  }
  const elapsedMs = performance.now() - start;

  return {
    name: 'view.compile',
    label: 'Compile welcome.tyr template',
    unit: 'ops/s',
    samples: iterations,
    elapsedMs,
    value: Math.round((iterations / elapsedMs) * 1000),
  };
}

export async function runBenchmarks(options = {}) {
  const httpOptions = { ...DEFAULTS.http, ...options.http };
  const competitive = await runCompetitiveBenchmarks(httpOptions, measureHttp);
  const results = [
    await measureBootCold(options.boot),
    await measureHttp(httpOptions),
    ...competitive,
    await measureHttpJsonFast(options.http),
    await measureMiddlewareStack(options.middleware),
    await measureSessionAuth(options.middleware),
    await measureHttpSsr(options.http),
    await measureOrm(options.orm),
    await measureOrmPruned(options.orm),
    measureViewCompile(options.views),
    await measureViewRender(options.views),
  ];

  return {
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch,
    timestamp: new Date().toISOString(),
    quick: QUICK,
    results,
    competitive,
  };
}

function formatResultLine(result) {
  return `${result.label}: ${result.value.toLocaleString()} ${result.unit}`
    + ` (${result.samples.toLocaleString()} samples in ${result.elapsedMs.toFixed(1)} ms)`;
}

function printHuman(report) {
  console.log(`Pondoknusa benchmarks (Node ${report.node}, ${report.platform}/${report.arch})`);
  if (report.quick) {
    console.log('Quick mode — set BENCHMARK_QUICK=0 for full samples.');
  }
  console.log('');

  const compareNames = new Set((report.competitive ?? []).map((entry) => entry.name));
  const coreResults = report.results.filter((result) => !compareNames.has(result.name));
  const compareResults = report.competitive ?? report.results.filter((result) => result.category === 'compare');

  for (const result of coreResults) {
    console.log(formatResultLine(result));
  }

  if (compareResults.length > 0) {
    console.log('');
    console.log('Competitive JSON (/bench, same payload, fetch client):');
    const sorted = [...compareResults]
      .filter((result) => result && Number.isFinite(result.value))
      .sort((left, right) => right.value - left.value);
    for (const result of sorted) {
      console.log(formatResultLine(result));
    }
  }
}

async function main() {
  const json = process.argv.includes('--json');
  const report = await runBenchmarks();
  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  printHuman(report);
}

const executedDirectly = process.argv[1]
  && fileURLToPath(import.meta.url) === process.argv[1];

if (executedDirectly) {
  await main();
}