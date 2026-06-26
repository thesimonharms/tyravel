import { describe, expect, it } from 'vitest';
import {
  buildTurboStream,
  isHtmxRequest,
  isTurboFrameRequest,
} from './partial-reload.js';
import { Response } from './response.js';

describe('partial reload helpers', () => {
  it('detects HTMX and Turbo frame requests', () => {
    expect(
      isHtmxRequest(
        new Request('http://localhost/posts', {
          headers: { 'HX-Request': 'true' },
        }),
      ),
    ).toBe(true);
    expect(
      isTurboFrameRequest(
        new Request('http://localhost/posts', {
          headers: { 'Turbo-Frame': 'post-list' },
        }),
      ),
    ).toBe(true);
  });

  it('builds turbo stream markup', () => {
    expect(buildTurboStream('replace', 'messages', '<li>Hi</li>')).toContain(
      'action="replace"',
    );
    expect(buildTurboStream('remove', 'messages')).toContain('action="remove"');
  });

  it('returns partial HTML with HTMX and Turbo headers', () => {
    const response = Response.partial('<section>Updated</section>', {
      turboFrame: 'post-list',
      htmxTrigger: 'postUpdated',
      htmxPushUrl: '/posts/1',
    });

    expect(response.headers.get('content-type')).toContain('text/html');
    expect(response.headers.get('Turbo-Frame')).toBe('post-list');
    expect(response.headers.get('HX-Trigger')).toBe('postUpdated');
    expect(response.headers.get('HX-Push-Url')).toBe('/posts/1');
  });

  it('uses turbo stream content type when requested', () => {
    const response = Response.partial(
      buildTurboStream('replace', 'messages', '<li>Hi</li>'),
      { turboStream: true },
    );

    expect(response.headers.get('content-type')).toContain('text/vnd.turbo-stream.html');
  });
});