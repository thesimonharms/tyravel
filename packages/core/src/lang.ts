import {
  formatCurrency,
  formatDate,
  formatNumber,
  type FormatCurrencyOptions,
  type FormatDateOptions,
  type FormatNumberOptions,
  type Translator,
} from '@pondoknusa/locale';
import type { Application } from './application.js';

let langApplication: Application | undefined;

export function setLangApplication(app: Application): void {
  langApplication = app;
}

function resolveTranslator(): Translator {
  if (!langApplication) {
    throw new Error('Lang facade is not ready. Boot the application first.');
  }
  return langApplication.make<Translator>('locale');
}

export interface LangFacade {
  getLocale(): string;
  setLocale(locale: string): void;
  getFakerLocale(): string;
  get(key: string, replacements?: Record<string, string | number>): string;
  choice(key: string, count: number, replacements?: Record<string, string | number>): string;
  has(key: string): boolean;
  formatDate(value: Date | string | number, options?: FormatDateOptions): string;
  formatNumber(value: number, options?: FormatNumberOptions): string;
  formatCurrency(value: number, currency: string, options?: FormatCurrencyOptions): string;
}

function readFakerLocale(): string {
  if (!langApplication) {
    return 'en';
  }
  const config = langApplication.make<{ get: (key: string, fallback?: unknown) => unknown }>('config');
  return String(config.get('app.faker_locale', 'en'));
}

export const Lang: LangFacade = {
  getLocale: () => resolveTranslator().getLocale(),
  setLocale: (locale) => {
    resolveTranslator().setLocale(locale);
  },
  getFakerLocale: () => readFakerLocale(),
  get: (key, replacements = {}) => resolveTranslator().get(key, { replacements }),
  choice: (key, count, replacements = {}) =>
    resolveTranslator().choice(key, count, replacements),
  has: (key) => resolveTranslator().has(key),
  formatDate: (value, options = {}) =>
    formatDate(value, resolveTranslator().getLocale(), options),
  formatNumber: (value, options = {}) =>
    formatNumber(value, resolveTranslator().getLocale(), options),
  formatCurrency: (value, currency, options = {}) =>
    formatCurrency(value, currency, resolveTranslator().getLocale(), options),
};