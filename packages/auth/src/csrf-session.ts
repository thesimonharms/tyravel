import { randomBytes } from 'node:crypto';
import type { Session } from './session.js';

/** Ensure the session has a CSRF token (created on first use, reused thereafter). */
export function ensureSessionCsrfToken(session: Session | undefined): string | undefined {
  if (!session) {
    return undefined;
  }

  let token = session.get<string>('_csrf_token');
  if (!token) {
    token = randomBytes(32).toString('base64url');
    session.put('_csrf_token', token);
  }

  return token;
}