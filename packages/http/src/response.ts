import {
  applyPartialReloadHeaders,
  type PartialReloadOptions,
} from './partial-reload.js';
import {
  buildSsrDocument,
  streamSsrDocument,
  type HydrationManifestPayload,
  type SsrDocumentOptions,
  type SsrStreamOptions,
} from './ssr.js';
import { encodeSseEvents, type SseEvent } from './sse.js';

const WebResponse = globalThis.Response;

const JSON_RESPONSE_HEADERS = new Headers({
  'content-type': 'application/json; charset=utf-8',
});

export type {
  HydrationManifestPayload,
  PartialReloadOptions,
  SsrDocumentOptions,
  SsrStreamOptions,
  SseEvent,
};

export class ResponseFactory {
  json(data: unknown, init: ResponseInit = {}): Response {
    const body = JSON.stringify(data);

    if (init.status === undefined && init.statusText === undefined && init.headers === undefined) {
      return new WebResponse(body, { headers: JSON_RESPONSE_HEADERS });
    }

    const headers = new Headers(init.headers);
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json; charset=utf-8');
    }

    return new WebResponse(body, {
      status: init.status,
      statusText: init.statusText,
      headers,
    });
  }

  html(body: string, init: ResponseInit = {}): Response {
    const headers = new Headers(init.headers);
    if (!headers.has('content-type')) {
      headers.set('content-type', 'text/html; charset=utf-8');
    }

    return new WebResponse(body, {
      ...init,
      headers,
    });
  }

  partial(
    body: string,
    options: PartialReloadOptions = {},
    init: ResponseInit = {},
  ): Response {
    const headers = new Headers(init.headers);
    if (!headers.has('content-type')) {
      headers.set(
        'content-type',
        options.turboStream
          ? 'text/vnd.turbo-stream.html; charset=utf-8'
          : 'text/html; charset=utf-8',
      );
    }

    applyPartialReloadHeaders(headers, options);

    return new WebResponse(body, {
      ...init,
      headers,
    });
  }

  ssr(body: string, options: SsrDocumentOptions = {}, init: ResponseInit = {}): Response {
    return this.html(buildSsrDocument(body, options), init);
  }

  ssrStream(
    source: AsyncIterable<string> | ReadableStream<string>,
    options: SsrStreamOptions = {},
    init: ResponseInit = {},
  ): Response {
    if (source instanceof ReadableStream) {
      return this.streamHtml(source, init);
    }

    return this.streamHtml(streamSsrDocument(source, options), init);
  }

  sse(source: AsyncIterable<SseEvent>, init: ResponseInit = {}): Response {
    const headers = new Headers(init.headers);
    if (!headers.has('content-type')) {
      headers.set('content-type', 'text/event-stream; charset=utf-8');
    }
    if (!headers.has('cache-control')) {
      headers.set('cache-control', 'no-cache, no-transform');
    }
    if (!headers.has('connection')) {
      headers.set('connection', 'keep-alive');
    }

    return new WebResponse(readableStreamFromAsyncIterable(encodeSseEvents(source)), {
      ...init,
      headers,
    });
  }

  streamHtml(
    source: AsyncIterable<string> | ReadableStream<string>,
    init: ResponseInit = {},
  ): Response {
    const headers = new Headers(init.headers);
    if (!headers.has('content-type')) {
      headers.set('content-type', 'text/html; charset=utf-8');
    }

    const stream =
      source instanceof ReadableStream
        ? source
        : readableStreamFromAsyncIterable(encodeHtmlChunks(source));

    return new WebResponse(stream, {
      ...init,
      headers,
    });
  }

  text(body: string, init: ResponseInit = {}): Response {
    const headers = new Headers(init.headers);
    if (!headers.has('content-type')) {
      headers.set('content-type', 'text/plain; charset=utf-8');
    }

    return new WebResponse(body, {
      ...init,
      headers,
    });
  }

  make(body: string, init: ResponseInit = {}): Response {
    return new WebResponse(body, {
      ...init,
      headers: new Headers(init.headers),
    });
  }

  xml(body: string, init: ResponseInit = {}): Response {
    const headers = new Headers(init.headers);
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/xml; charset=utf-8');
    }

    return new WebResponse(body, {
      ...init,
      headers,
    });
  }

  redirect(location: string, status = 302, request?: { url: string | URL }): Response {
    return WebResponse.redirect(resolveRedirectLocation(location, request), status);
  }

  noContent(status = 204): Response {
    return new WebResponse(null, { status });
  }
}

export const Response = new ResponseFactory();

function resolveRedirectLocation(location: string, request?: { url: string | URL }): string {
  if (location.startsWith('http://') || location.startsWith('https://')) {
    return location;
  }

  const base =
    request?.url !== undefined
      ? String(request.url)
      : (process.env.APP_URL ?? 'http://127.0.0.1:3000');

  return new URL(location, base).href;
}

async function* encodeHtmlChunks(
  source: AsyncIterable<string>,
): AsyncGenerator<Uint8Array> {
  const encoder = new TextEncoder();
  for await (const chunk of source) {
    yield encoder.encode(chunk);
  }
}

function readableStreamFromAsyncIterable(
  source: AsyncIterable<Uint8Array>,
): ReadableStream<Uint8Array> {
  const iterator = source[Symbol.asyncIterator]();

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await iterator.next();
      if (done) {
        controller.close();
        return;
      }
      controller.enqueue(value);
    },
    async cancel() {
      await iterator.return?.();
    },
  });
}