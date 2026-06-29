import { Application, HttpKernel, Route, serve, setRouteApplication } from '@pondoknusa/core';
import { Response } from '@pondoknusa/http';

export interface PerfSmokeResult {
  ok: boolean;
  message: string;
}

const QUICK_REQUESTS = 50;
const MIN_THROUGHPUT = 100;

export async function runPerfSmoke(): Promise<PerfSmokeResult> {
  const app = new Application();
  setRouteApplication(app);
  Route.get('/bench', () => Response.json({ ok: true }));
  const kernel = new HttpKernel(app);
  const server = await serve(kernel, { port: 0, hostname: '127.0.0.1', quiet: true });
  const url = `http://${server.hostname}:${server.port}/bench`;

  try {
    for (let index = 0; index < 10; index += 1) {
      const response = await fetch(url);
      if (!response.ok) {
        return { ok: false, message: `HTTP smoke failed with status ${response.status}` };
      }
      await response.arrayBuffer();
    }

    const start = performance.now();
    await Promise.all(
      Array.from({ length: QUICK_REQUESTS }, async () => {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP smoke failed with status ${response.status}`);
        }
        await response.arrayBuffer();
      }),
    );
    const elapsedMs = performance.now() - start;
    const throughput = Math.round((QUICK_REQUESTS / elapsedMs) * 1000);

    if (throughput < MIN_THROUGHPUT) {
      return {
        ok: false,
        message: `HTTP throughput ${throughput} req/s is below ${MIN_THROUGHPUT} req/s baseline`,
      };
    }

    return {
      ok: true,
      message: `HTTP smoke ${throughput} req/s (${QUICK_REQUESTS} requests)`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await server.close();
  }
}