import type { SessionContract, PondoknusaRequest } from '@pondoknusa/http';

export function readUserLocale(user: unknown): string | undefined {
  if (!user || typeof user !== 'object' || !('locale' in user)) {
    return undefined;
  }

  const locale = (user as { locale?: unknown }).locale;
  return typeof locale === 'string' && locale.length > 0 ? locale : undefined;
}

export function persistLocaleToSession(
  session: SessionContract | undefined,
  locale: string,
  sessionKey = 'locale',
): void {
  session?.put(sessionKey, locale);
}

export interface UpdateLocalePreferenceOptions {
  availableLocales: string[];
  sessionKey?: string;
  saveUser?: (locale: string) => Promise<void>;
}

export async function updateLocalePreference(
  request: PondoknusaRequest,
  locale: string,
  options: UpdateLocalePreferenceOptions,
): Promise<boolean> {
  const normalized = options.availableLocales.find(
    (entry) => entry.toLowerCase() === locale.toLowerCase(),
  );
  if (!normalized) {
    return false;
  }

  persistLocaleToSession(request.session, normalized, options.sessionKey);
  if (options.saveUser) {
    await options.saveUser(normalized);
  }

  return true;
}