import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generatePlainToken(prefix: string): string {
  return `${prefix}${randomBytes(32).toString('hex')}`;
}

export function secretsMatch(expected: string, actual: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(actual, 'utf8');
  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}

export function parseJsonArray(raw: string | null | undefined, fallback: string[] = []): string[] {
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return fallback;
    }

    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return fallback;
  }
}

export function normalizeBearerSecret(bearer: string, prefix: string): string {
  if (bearer.startsWith(prefix)) {
    return bearer.slice(prefix.length);
  }

  return bearer;
}