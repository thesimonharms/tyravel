const WebResponse = globalThis.Response;

export class ResponseFactory {
  json(data: unknown, init: ResponseInit = {}): Response {
    const headers = new Headers(init.headers);
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json; charset=utf-8');
    }

    return new WebResponse(JSON.stringify(data), {
      ...init,
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
        : ReadableStream.from(encodeHtmlChunks(source));

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

  redirect(location: string, status = 302): Response {
    return WebResponse.redirect(location, status);
  }

  noContent(status = 204): Response {
    return new WebResponse(null, { status });
  }
}

export const Response = new ResponseFactory();

async function* encodeHtmlChunks(
  source: AsyncIterable<string>,
): AsyncGenerator<Uint8Array> {
  const encoder = new TextEncoder();
  for await (const chunk of source) {
    yield encoder.encode(chunk);
  }
}