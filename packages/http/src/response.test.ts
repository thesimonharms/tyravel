import { describe, expect, it } from 'vitest';
import { Response } from './response.js';

describe('Response.redirect', () => {
  it('resolves relative paths against APP_URL', () => {
    const previous = process.env.APP_URL;
    process.env.APP_URL = 'https://pondoknusa.com';

    try {
      const response = Response.redirect('/dashboard');
      expect(response.headers.get('location')).toBe('https://pondoknusa.com/dashboard');
    } finally {
      if (previous === undefined) {
        delete process.env.APP_URL;
      } else {
        process.env.APP_URL = previous;
      }
    }
  });

  it('resolves relative paths against the request URL', () => {
    const request = { url: 'https://pondoknusa.com/register' };
    const response = Response.redirect('/dashboard', 302, request);
    expect(response.headers.get('location')).toBe('https://pondoknusa.com/dashboard');
  });

  it('passes through absolute URLs', () => {
    const response = Response.redirect('https://example.com/path');
    expect(response.headers.get('location')).toBe('https://example.com/path');
  });
});