import { describe, expect, it } from 'vitest';
import { Response } from './response.js';

describe('Response', () => {
  it('returns a raw body with a custom content-type via make', async () => {
    const body = '<?xml version="1.0"?><rss version="2.0"></rss>';
    const response = Response.make(body, {
      headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe(
      'application/rss+xml; charset=utf-8',
    );
    expect(await response.text()).toBe(body);
  });

  it('supports atom feeds with make and a custom content-type', async () => {
    const body = '<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"></feed>';
    const response = Response.make(body, {
      headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
    });

    expect(response.headers.get('content-type')).toBe(
      'application/atom+xml; charset=utf-8',
    );
    expect(await response.text()).toBe(body);
  });

  it('returns xml with a default content-type', async () => {
    const body = '<?xml version="1.0"?><root></root>';
    const response = Response.xml(body);

    expect(response.headers.get('content-type')).toBe(
      'application/xml; charset=utf-8',
    );
    expect(await response.text()).toBe(body);
  });

  it('allows overriding the xml content-type', async () => {
    const body = '<?xml version="1.0"?><rss version="2.0"></rss>';
    const response = Response.xml(body, {
      headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
    });

    expect(response.headers.get('content-type')).toBe(
      'application/rss+xml; charset=utf-8',
    );
    expect(await response.text()).toBe(body);
  });

  it('streams chunked html from an async iterable', async () => {
    async function* chunks(): AsyncGenerator<string> {
      yield '<html><head><title>Stream</title></head>';
      yield '<body><main>Ready</main></body></html>';
    }

    const response = Response.streamHtml(chunks());
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(await response.text()).toBe(
      '<html><head><title>Stream</title></head><body><main>Ready</main></body></html>',
    );
  });

  it('forwards status and extra headers', async () => {
    const response = Response.make('created', {
      status: 201,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        Location: '/feeds/latest',
      },
    });

    expect(response.status).toBe(201);
    expect(response.headers.get('location')).toBe('/feeds/latest');
    expect(await response.text()).toBe('created');
  });
});