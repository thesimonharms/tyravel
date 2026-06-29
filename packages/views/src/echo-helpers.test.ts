import { describe, expect, it } from 'vitest';
import { ECHO_CONFIG_SCRIPT_ID, renderEchoBootstrap } from './echo-helpers.js';

describe('renderEchoBootstrap', () => {
  it('returns empty output when broadcasting is disabled', () => {
    expect(
      renderEchoBootstrap(null, { 'resources/client/echo.ts': { file: 'assets/echo.js' } }, 'resources/client/echo.ts'),
    ).toBe('');
  });

  it('injects client-safe config and vite tags', () => {
    const html = renderEchoBootstrap(
      {
        broadcaster: 'websocket',
        host: 'http://127.0.0.1:3000',
        path: '/pondoknusa/ws',
        authEndpoint: '/broadcasting/auth',
      },
      {
        'resources/client/echo.ts': {
          file: 'assets/echo.js',
        },
      },
      'resources/client/echo.ts',
      '/build',
    );

    expect(html).toContain(`id="${ECHO_CONFIG_SCRIPT_ID}"`);
    expect(html).toContain('"broadcaster":"websocket"');
    expect(html).toContain('/build/assets/echo.js');
  });
});