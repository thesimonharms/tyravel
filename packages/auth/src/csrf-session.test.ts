import { describe, expect, it } from 'vitest';
import { ensureSessionCsrfToken } from './csrf-session.js';
import { Session } from './session.js';

describe('ensureSessionCsrfToken', () => {
  it('creates and reuses a session token', () => {
    const session = new Session('sess-1', {});

    const first = ensureSessionCsrfToken(session);
    const second = ensureSessionCsrfToken(session);

    expect(first).toBeTruthy();
    expect(second).toBe(first);
    expect(session.get('_csrf_token')).toBe(first);
  });
});