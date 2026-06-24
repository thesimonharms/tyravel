import { describe, expect, it } from 'vitest';
import { buildSsrDocument, streamSsrDocument } from './ssr.js';
import { Response } from './response.js';

describe('buildSsrDocument', () => {
  it('wraps fragments in a full html document', () => {
    const html = buildSsrDocument('<main>Hello</main>', {
      title: 'Welcome',
      lang: 'en',
    });

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>Welcome</title>');
    expect(html).toContain('<main>Hello</main>');
  });

  it('injects hydration manifest before </body> in full documents', () => {
    const html = buildSsrDocument(
      '<!DOCTYPE html><html><head></head><body><main>Hi</main></body></html>',
      {
        hydrationManifest: {
          islands: [{ id: 'counter', html: '<button>1</button>', props: { n: 1 } }],
        },
      },
    );

    expect(html).toContain('id="tyr-hydration"');
    expect(html).toContain('"counter"');
    expect(html.indexOf('tyr-hydration')).toBeLessThan(html.indexOf('</body>'));
  });

  it('injects head snippets before </head>', () => {
    const html = buildSsrDocument('<main>Hi</main>', {
      head: '<link rel="stylesheet" href="/app.css">',
    });

    expect(html).toContain('<link rel="stylesheet" href="/app.css">');
    expect(html.indexOf('/app.css')).toBeLessThan(html.indexOf('</head>'));
  });
});

describe('streamSsrDocument', () => {
  it('wraps fragment streams and resolves lazy hydration manifests', async () => {
    let manifestResolved = false;

    async function* viewChunks(): AsyncGenerator<string> {
      yield '<main>Core</main>';
      yield '<aside>Sidebar</aside>';
    }

    const chunks: string[] = [];
    for await (const chunk of streamSsrDocument(viewChunks(), {
      title: 'Dashboard',
      hydrationManifest: () => {
        manifestResolved = true;
        return {
          islands: [{ id: 'counter', html: '<button>1</button>', props: { n: 1 } }],
        };
      },
    })) {
      chunks.push(chunk);
    }

    const html = chunks.join('');
    expect(manifestResolved).toBe(true);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>Dashboard</title>');
    expect(html).toContain('<main>Core</main>');
    expect(html).toContain('<aside>Sidebar</aside>');
    expect(html).toContain('id="tyr-hydration"');
    expect(html.indexOf('<main>Core</main>')).toBeLessThan(html.indexOf('<aside>Sidebar</aside>'));
  });

  it('injects hydration manifest into full html documents', async () => {
    async function* viewChunks(): AsyncGenerator<string> {
      yield '<html><head><title>App</title></head><body><main>Hi</main>';
      yield '</body></html>';
    }

    const html = [];
    for await (const chunk of streamSsrDocument(viewChunks(), {
      hydrationManifest: {
        islands: [{ id: 'counter', html: '<span>0</span>', props: {} }],
      },
    })) {
      html.push(chunk);
    }

    const combined = html.join('');
    expect(combined).toContain('id="tyr-hydration"');
    expect(combined.indexOf('tyr-hydration')).toBeLessThan(combined.indexOf('</body>'));
  });
});

describe('Response.ssr', () => {
  it('returns html with hydration manifest script', async () => {
    const response = Response.ssr('<main>Ready</main>', {
      title: 'SSR',
      hydrationManifest: {
        islands: [{ id: 'counter', html: '<span>0</span>', props: {} }],
      },
    });

    const body = await response.text();
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(body).toContain('id="tyr-hydration"');
    expect(body).toContain('<main>Ready</main>');
  });
});

describe('Response.ssrStream', () => {
  it('returns a chunked html response from a view stream', async () => {
    async function* chunks(): AsyncGenerator<string> {
      yield '<main>Core</main>';
      yield '<aside>Late</aside>';
    }

    const response = Response.ssrStream(chunks(), {
      title: 'Streamed',
      hydrationManifest: { islands: [] },
    });

    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(response.body).not.toBeNull();

    const html = await response.text();
    expect(html).toContain('<main>Core</main>');
    expect(html).toContain('<aside>Late</aside>');
    expect(html).toContain('</html>');
  });
});