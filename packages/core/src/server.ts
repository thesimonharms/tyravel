import { serveWithNode } from './adapters/node-server.js';
import type { HttpKernel } from './http-kernel.js';

export interface ServeOptions {
  port?: number;
  hostname?: string;
}

interface BunServe {
  serve(options: {
    hostname: string;
    port: number;
    fetch: (request: Request) => Response | Promise<Response>;
  }): { hostname: string; port: number; stop(closeActiveConnections?: boolean): void };
}

export async function serve(
  kernel: HttpKernel,
  options: ServeOptions = {},
): Promise<{ hostname: string; port: number; close: () => Promise<void> }> {
  const port = options.port ?? (Number(process.env.TYRAVEL_PORT) || 3000);
  const hostname = options.hostname ?? (process.env.TYRAVEL_HOST || '127.0.0.1');
  const bun = (globalThis as { Bun?: BunServe }).Bun;

  if (bun) {
    const server = bun.serve({
      hostname,
      port,
      fetch: (request) => kernel.handle(request),
    });

    console.log(`Tyravel server running at http://${server.hostname}:${server.port}`);

    const shutdown = () => {
      console.log('Shutting down Tyravel server gracefully...');
      server.stop();
      if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
        process.exit(0);
      }
    };

    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
      process.on('SIGTERM', shutdown);
      process.on('SIGINT', shutdown);
    }

    return {
      hostname: server.hostname,
      port: server.port,
      close: async () => {
        if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
          process.off('SIGTERM', shutdown);
          process.off('SIGINT', shutdown);
        }
        server.stop();
      },
    };
  }

  const server = await serveWithNode(kernel, hostname, port);
  console.log(`Tyravel server running at http://${server.hostname}:${server.port}`);

  const shutdown = async () => {
    console.log('Shutting down Tyravel server gracefully...');
    try {
      await server.close();
      if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
        process.exit(0);
      }
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
        process.exit(1);
      }
    }
  };

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }

  return {
    hostname: server.hostname,
    port: server.port,
    close: async () => {
      if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
        process.off('SIGTERM', shutdown);
        process.off('SIGINT', shutdown);
      }
      await server.close();
    },
  };
}