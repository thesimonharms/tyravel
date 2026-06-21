import { describe, expect, it } from 'vitest';
import { Response } from '@tyravel/http';
import { Application } from './application.js';
import { HttpKernel } from './http-kernel.js';
import { Route, setRouteApplication } from './route.js';
import { serve } from './server.js';

describe('Server Graceful Shutdown', () => {
  it('drains in-flight requests and rejects new ones', async () => {
    const app = new Application();
    setRouteApplication(app);

    Route.get('/slow', async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return Response.json({ done: true });
    });

    const kernel = new HttpKernel(app);
    const server = await serve(kernel, { port: 0, hostname: '127.0.0.1' });

    // Start slow request
    const url = `http://${server.hostname}:${server.port}/slow`;
    const requestPromise = fetch(url);

    // Give it a tiny delay to ensure connection is established and handler is running
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Initiate graceful shutdown
    const closePromise = server.close();

    // The slow request should resolve successfully since it's already in flight
    const response = await requestPromise;
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ done: true });

    // Wait for the server to finish closing
    await closePromise;

    // Subsequent requests should fail as the server is closed
    await expect(fetch(url)).rejects.toThrow();
  });
});
