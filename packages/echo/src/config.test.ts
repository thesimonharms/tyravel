import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';
import { ECHO_CONFIG_SCRIPT_ID, readEchoConfigFromDocument } from './config.js';

describe('readEchoConfigFromDocument', () => {
  it('reads websocket config from the bootstrap script tag', () => {
    const window = new Window();
    window.document.write(`
      <script type="application/json" id="${ECHO_CONFIG_SCRIPT_ID}">
        {"broadcaster":"websocket","host":"http://127.0.0.1:3000","path":"/pondoknusa/ws","authEndpoint":"/broadcasting/auth"}
      </script>
    `);

    expect(readEchoConfigFromDocument(window.document)).toEqual({
      broadcaster: 'websocket',
      host: 'http://127.0.0.1:3000',
      path: '/pondoknusa/ws',
      authEndpoint: '/broadcasting/auth',
    });
  });

  it('returns undefined when the script tag is missing', () => {
    const window = new Window();
    expect(readEchoConfigFromDocument(window.document)).toBeUndefined();
  });
});