import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Socket } from 'node:net';
import type { HttpKernel } from '../http-kernel.js';

export async function serveWithNode(
  kernel: HttpKernel,
  hostname: string,
  port: number,
): Promise<{ hostname: string; port: number; close: () => Promise<void> }> {
  return createNodeServer(kernel, hostname, port);
}

async function createNodeServer(
  kernel: HttpKernel,
  hostname: string,
  port: number,
) {
  const { createServer } = await import('node:http');

  let isShuttingDown = false;
  const connections = new Set<Socket>();

  const server = createServer(async (incoming, outgoing) => {
    try {
      if (isShuttingDown) {
        outgoing.setHeader('Connection', 'close');
        outgoing.statusCode = 503;
        outgoing.end('Service Unavailable');
        return;
      }

      const request = await toFetchRequest(incoming);
      const response = await kernel.handle(request);

      if (isShuttingDown) {
        response.headers.set('Connection', 'close');
      }

      await writeFetchResponse(outgoing, response);
    } catch (error) {
      console.error(error);
      outgoing.statusCode = 500;
      outgoing.end('Server Error');
    }
  });

  server.on('connection', (socket) => {
    connections.add(socket);
    (socket as any)._activeRequests = 0;
    socket.on('close', () => {
      connections.delete(socket);
    });
  });

  server.on('request', (incoming, outgoing) => {
    const socket = incoming.socket;
    (socket as any)._activeRequests = ((socket as any)._activeRequests || 0) + 1;

    let decremented = false;
    const decrement = () => {
      if (decremented) return;
      decremented = true;
      (socket as any)._activeRequests = Math.max(0, ((socket as any)._activeRequests || 0) - 1);
      if (isShuttingDown && (socket as any)._activeRequests === 0) {
        socket.end();
      }
    };

    outgoing.on('finish', decrement);
    outgoing.on('close', decrement);
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(port, hostname, () => resolve());
    server.on('error', reject);
  });

  const address = server.address();
  const resolvedHost = typeof address === 'object' && address ? address.address : hostname;
  const resolvedPort = typeof address === 'object' && address ? address.port : port;

  return {
    hostname: resolvedHost,
    port: resolvedPort,
    close: async () => {
      isShuttingDown = true;

      const closePromise = new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });

      // End all idle connections immediately
      for (const socket of connections) {
        if ((socket as any)._activeRequests === 0) {
          socket.end();
        }
      }

      // If connections still exist, give them a timeout (5 seconds) to finish
      let timeout: NodeJS.Timeout | undefined;
      if (connections.size > 0) {
        timeout = setTimeout(() => {
          for (const socket of connections) {
            socket.destroy();
          }
        }, 5000);
      }

      try {
        await closePromise;
      } finally {
        if (timeout) {
          clearTimeout(timeout);
        }
      }
    },
  };
}

async function toFetchRequest(incoming: IncomingMessage): Promise<Request> {
  const host = incoming.headers.host ?? 'localhost';
  const url = new URL(incoming.url ?? '/', `http://${host}`);
  const method = incoming.method ?? 'GET';
  const headers = new Headers();

  for (const [key, value] of Object.entries(incoming.headers)) {
    if (value === undefined) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
      continue;
    }
    headers.set(key, value);
  }

  const init: RequestInit = { method, headers };

  if (method !== 'GET' && method !== 'HEAD') {
    const body = await readIncomingBody(incoming);
    if (body.length > 0) {
      init.body = Buffer.from(body);
    }
  }

  return new Request(url, init);
}

async function readIncomingBody(incoming: IncomingMessage): Promise<Uint8Array> {
  const chunks: Buffer[] = [];

  for await (const chunk of incoming) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

async function writeFetchResponse(
  outgoing: ServerResponse,
  response: Response,
): Promise<void> {
  outgoing.statusCode = response.status;

  response.headers.forEach((value, key) => {
    outgoing.setHeader(key, value);
  });

  if (!response.body) {
    outgoing.end();
    return;
  }

  const reader = response.body.getReader();

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      if (value.byteLength > 0) {
        outgoing.write(Buffer.from(value));
      }
    }

    outgoing.end();
  } catch (error) {
    outgoing.destroy(error instanceof Error ? error : new Error(String(error)));
  } finally {
    reader.releaseLock();
  }
}