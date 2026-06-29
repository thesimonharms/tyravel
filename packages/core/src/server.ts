import { serveWithNode } from './adapters/node-server.js';
import type { HttpKernel } from './http-kernel.js';

export interface ServeOptions {
  port?: number;
  hostname?: string;
  /** Suppress startup/shutdown log lines (useful for JSON benchmark output). */
  quiet?: boolean;
  /** PEM certificate and key paths for local HTTPS (Node adapter only). */
  tls?: {
    certPath: string;
    keyPath: string;
  };
  /**
   * Use HTTP/2 on the Node adapter (requires `tls`). Falls back to HTTP/1.1 when
   * TLS is unavailable (Bun) or `http2` is false.
   */
  http2?: boolean;
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
  const port = options.port ?? (Number(process.env.PONDOKNUSA_PORT) || 3000);
  const hostname = options.hostname ?? (process.env.PONDOKNUSA_HOST || '127.0.0.1');
  const quiet = options.quiet === true;
  const tls = options.tls ?? (
    process.env.PONDOKNUSA_TLS_CERT && process.env.PONDOKNUSA_TLS_KEY
      ? { certPath: process.env.PONDOKNUSA_TLS_CERT, keyPath: process.env.PONDOKNUSA_TLS_KEY }
      : undefined
  );
  const http2 = options.http2 === true
    || (options.http2 !== false && process.env.PONDOKNUSA_HTTP2 === '1' && Boolean(tls));
  const scheme = tls ? 'https' : 'http';
  const bun = (globalThis as { Bun?: BunServe }).Bun;

  if (bun) {
    const server = bun.serve({
      hostname,
      port,
      fetch: (request) => kernel.handle(request),
    });

    if (!quiet) {
      if (tls) {
        console.warn('TLS is not supported on Bun yet — serving over HTTP.');
      }
      console.log(`Pondoknusa server running at ${scheme}://${server.hostname}:${server.port}`);
    }

    const shutdown = () => {
      if (!quiet) {
        console.log('Shutting down Pondoknusa server gracefully...');
      }
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

  const server = await serveWithNode(kernel, hostname, port, { tls, http2: http2 && Boolean(tls) });
  if (!quiet) {
    const protocol = http2 && tls ? 'https (HTTP/2)' : scheme;
    console.log(`Pondoknusa server running at ${protocol}://${server.hostname}:${server.port}`);
  }

  const shutdown = async () => {
    if (!quiet) {
      console.log('Shutting down Pondoknusa server gracefully...');
    }
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