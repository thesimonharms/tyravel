import { afterEach, describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { Http } from './client.js';

describe('Fluent HTTP Client', () => {
  afterEach(() => {
    Http.clear();
  });

  it('sends simple GET and POST requests to a real server', async () => {
    const server = createServer(async (req, res) => {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }
      res.writeHead(200, { 'Content-Type': 'application/json', 'X-Custom-Echo': req.headers['x-custom'] ?? '' });
      res.end(JSON.stringify({
        method: req.method,
        url: req.url,
        body: body ? JSON.parse(body) : null,
      }));
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const address = server.address() as any;
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
      // Test GET
      const getRes = await Http.withHeaders({ 'X-Custom': 'hello' }).get(`${baseUrl}/test`, { foo: 'bar' });
      expect(getRes.status()).toBe(200);
      expect(getRes.ok()).toBe(true);
      expect(getRes.header('X-Custom-Echo')).toBe('hello');
      expect(getRes.json()).toEqual({
        method: 'GET',
        url: '/test?foo=bar',
        body: null,
      });

      // Test POST
      const postRes = await Http.post(`${baseUrl}/post`, { name: 'Steve' });
      expect(postRes.status()).toBe(200);
      expect(postRes.json()).toEqual({
        method: 'POST',
        url: '/post',
        body: { name: 'Steve' },
      });
    } finally {
      server.close();
    }
  });

  it('supports faking all requests and asserting calls', async () => {
    Http.assertNothingSent();

    Http.fake();
    const response = await Http.get('https://example.com/api/users');
    expect(response.status()).toBe(200);
    expect(response.body()).toBe('');

    Http.assertSent((req) => req.url() === 'https://example.com/api/users' && req.method() === 'GET');
    expect(() => Http.assertNothingSent()).toThrow();
  });

  it('supports stubbing specific URLs with glob patterns', async () => {
    Http.fake({
      'github.com/users/*': Http.response({ username: 'steve' }, 200, { 'X-Platform': 'GitHub' }),
      'google.com/*': Http.response('Google Search', 200),
      '*': Http.response('Default fallback', 404),
    });

    const res1 = await Http.get('https://github.com/users/steve');
    expect(res1.status()).toBe(200);
    expect(res1.json()).toEqual({ username: 'steve' });
    expect(res1.header('X-Platform')).toBe('GitHub');

    const res2 = await Http.get('https://google.com/search?q=tyravel');
    expect(res2.status()).toBe(200);
    expect(res2.body()).toBe('Google Search');

    const res3 = await Http.get('https://otherdomain.com/path');
    expect(res3.status()).toBe(404);
    expect(res3.body()).toBe('Default fallback');
  });

  it('supports sequence stubbing', async () => {
    Http.fake({
      'api.com/items': Http.sequence()
        .push({ id: 1 }, 200)
        .push({ id: 2 }, 201)
        .push('Out of items', 404),
    });

    const res1 = await Http.get('https://api.com/items');
    expect(res1.status()).toBe(200);
    expect(res1.json()).toEqual({ id: 1 });

    const res2 = await Http.get('https://api.com/items');
    expect(res2.status()).toBe(201);
    expect(res2.json()).toEqual({ id: 2 });

    const res3 = await Http.get('https://api.com/items');
    expect(res3.status()).toBe(404);
    expect(res3.body()).toBe('Out of items');

    // Should repeat last stub
    const res4 = await Http.get('https://api.com/items');
    expect(res4.status()).toBe(404);
    expect(res4.body()).toBe('Out of items');
  });

  it('supports retry logic', async () => {
    let attempts = 0;
    const server = createServer((req, res) => {
      attempts++;
      if (attempts < 3) {
        res.writeHead(500);
        res.end('Error');
      } else {
        res.writeHead(200);
        res.end('Success');
      }
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const address = server.address() as any;
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
      const res = await Http.retry(3, 10).get(`${baseUrl}/retry`);
      expect(res.status()).toBe(200);
      expect(attempts).toBe(3);
    } finally {
      server.close();
    }
  });

  it('supports timeout logic', async () => {
    const server = createServer((req, res) => {
      setTimeout(() => {
        res.writeHead(200);
        res.end('Late response');
      }, 100);
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const address = server.address() as any;
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
      await expect(Http.timeout(30).get(`${baseUrl}/timeout`)).rejects.toThrow();
    } finally {
      server.close();
    }
  });
});
