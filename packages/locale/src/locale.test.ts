import { describe, expect, it } from 'vitest';
import { parseAcceptLanguage } from './accept-language.js';
import { formatCurrency, formatDate, formatNumber } from './formatters.js';
import { flattenTranslations } from './load.js';
import { parsePluralPipe, pluralCategory } from './pluralization.js';
import { Translator } from './translator.js';
import { updateLocalePreference } from './user-locale.js';

describe('@pondoknusa/locale', () => {
  it('flattens nested translation trees', () => {
    expect(
      flattenTranslations({
        messages: { welcome: 'Hello :name' },
      }),
    ).toEqual({ 'messages.welcome': 'Hello :name' });
  });

  it('resolves translations with fallback locale', () => {
    const translator = new Translator('/tmp', {
      locale: 'fr',
      fallback_locale: 'en',
    });
    translator.addLines('en', { 'messages.hello': 'Hello' });

    expect(translator.get('messages.hello')).toBe('Hello');
    expect(translator.get('messages.missing')).toBe('messages.missing');
  });

  it('selects plural forms by count', () => {
    const translator = new Translator('/tmp', {
      locale: 'en',
      fallback_locale: 'en',
    });
    translator.addLines('en', {
      'messages.items.one': ':count item',
      'messages.items.other': ':count items',
    });

    expect(translator.choice('messages.items', 1)).toBe('1 item');
    expect(translator.choice('messages.items', 3)).toBe('3 items');
  });

  it('parses plural pipe syntax', () => {
    expect(
      parsePluralPipe('{0} none|{1} one|[2,*] :count many', 0),
    ).toBe('none');
    expect(
      parsePluralPipe('{0} none|{1} one|[2,*] :count many', 4),
    ).toBe(':count many');
  });

  it('parses accept-language headers', () => {
    expect(
      parseAcceptLanguage('fr-FR,fr;q=0.9,en;q=0.8', ['en', 'fr']),
    ).toBe('fr');
    expect(pluralCategory('en', 1)).toBe('one');
  });

  it('formats dates, numbers, and currency for a locale', () => {
    expect(formatDate('2026-06-24', 'en-US', { dateStyle: 'long' })).toContain('2026');
    expect(formatNumber(1234.5, 'en-US')).toBe('1,234.5');
    expect(formatCurrency(19.99, 'USD', 'en-US')).toContain('19.99');
  });

  it('rejects invalid locale preference updates', async () => {
    const request = {
      session: {
        put: () => undefined,
      },
    } as never;

    await expect(
      updateLocalePreference(request, 'zz', { availableLocales: ['en', 'fr'] }),
    ).resolves.toBe(false);
  });
});