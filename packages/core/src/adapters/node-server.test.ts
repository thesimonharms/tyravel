import { describe, expect, it } from 'vitest';
import { Response } from '@tyravel/http';
import { Application } from '../application.js';
import { HttpKernel } from '../http-kernel.js';
import { Route, setRouteApplication } from '../route.js';
import { serve } from '../server.js';

describe('node server streaming', () => {
  it('flushes html chunks before the stream completes', async () => {
    const app = new Application();
    setRouteApplication(app);

    Route.get('/stream', () =>
      Response.streamHtml(
        (async function* () {
          yield '<html><body><main>First</main>';
          await new Promise((resolve) => setTimeout(resolve, 40));
          yield '<aside>Second</aside></body></html>';
        })(),
      ),
    );

    const kernel = new HttpKernel(app);
    const server = await serve(kernel, { port: 0, hostname: '127.0.0.1' });
    const url = `http://${server.hostname}:${server.port}/stream`;

    try {
      const response = await fetch(url);
      expect(response.ok).toBe(true);

      const reader = response.body?.getReader();
      expect(reader).toBeDefined();

      const decoder = new TextDecoder();
      let received = '';

      const first = await reader!.read();
      received += decoder.decode(first.value);
      expect(received).toContain('<main>First</main>');
      expect(received).not.toContain('<aside>Second</aside>');

      const second = await reader!.read();
      received += decoder.decode(second.value);
      expect(received).toContain('<aside>Second</aside>');
    } finally {
      await server.close();
    }
  });
});