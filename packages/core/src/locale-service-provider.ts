import type { AuthManager } from '@pondoknusa/auth';
import { ConfigRepository } from '@pondoknusa/config';
import { withMiddlewareMeta } from '@pondoknusa/http';
import {
  createRouteLocaleMiddleware,
  createSetLocaleMiddleware,
  formatCurrency,
  formatDate,
  formatNumber,
  loadFrameworkCatalog,
  readUserLocale,
  type LocaleConfig,
  Translator,
} from '@pondoknusa/locale';
import { setFactoryLocale } from '@pondoknusa/database';
import { setValidationMessageResolver } from '@pondoknusa/validation';
import { ViewEngine } from '@pondoknusa/views';
import { ServiceProvider } from './service-provider.js';
import { setLangApplication } from './lang.js';
import { setUrlApplication } from './url.js';

const DEFAULT_LOCALE_CONFIG: LocaleConfig = {
  locale: 'en',
  fallback_locale: 'en',
  locales_path: 'lang',
  available_locales: ['en'],
};

export class LocaleServiceProvider extends ServiceProvider {
  override async register(): Promise<void> {
    const config = this.app.make<ConfigRepository>('config');
    const translator = new Translator(this.app.basePath, this.readLocaleConfig(config));

    this.app.instance('locale', translator);
    this.app.singleton(Translator, () => translator);
    setLangApplication(this.app);
    setUrlApplication(this.app);
  }

  override async boot(): Promise<void> {
    const config = this.app.make<ConfigRepository>('config');
    const localeConfig = this.readLocaleConfig(config);
    const translator = this.app.make<Translator>('locale');

    const locales = new Set([
      translator.getLocale(),
      translator.getFallbackLocale(),
      ...(localeConfig.available_locales ?? []),
    ]);

    await Promise.all(
      [...locales].map(async (locale) => {
        await translator.loadLocale(locale);
        const framework = await loadFrameworkCatalog(locale).catch(() => ({}));
        translator.addLines(locale, framework);
      }),
    );

    setValidationMessageResolver((key, replacements) => translator.get(key, { replacements }));
    setFactoryLocale(localeConfig.faker_locale ?? localeConfig.locale);

    this.app.middleware(
      'locale.fromRoute',
      createRouteLocaleMiddleware({
        translator,
        availableLocales: translator.getAvailableLocales(),
      }),
    );

    const router = this.app.router();
    router.mergeUrlDefaults({ locale: translator.getLocale() });

    this.app.use(
      withMiddlewareMeta(
        createSetLocaleMiddleware({
          translator,
          resolveLocale: (request) => this.resolveUserLocale(request),
        }),
        { tag: 'locale' },
      ),
    );

    this.app.use(
      withMiddlewareMeta(async (request, next) => {
        if (request.locale) {
          router.mergeUrlDefaults({ locale: request.locale });
        }
        return next();
      }, { tag: 'locale' }),
    );

    this.syncViewLocale(translator);
  }

  private readLocaleConfig(config: ConfigRepository): LocaleConfig {
    return {
      locale: String(config.get('app.locale', DEFAULT_LOCALE_CONFIG.locale)),
      fallback_locale: String(
        config.get('app.fallback_locale', DEFAULT_LOCALE_CONFIG.fallback_locale),
      ),
      faker_locale: String(
        config.get('app.faker_locale', DEFAULT_LOCALE_CONFIG.faker_locale ?? 'en'),
      ),
      locales_path: String(
        config.get('app.locales_path', DEFAULT_LOCALE_CONFIG.locales_path),
      ),
      available_locales: (config.get('app.available_locales') as string[] | undefined)
        ?? DEFAULT_LOCALE_CONFIG.available_locales,
    };
  }

  private resolveUserLocale(request: import('@pondoknusa/http').PondoknusaRequest): string | undefined {
    try {
      const auth = this.app.make<AuthManager>('auth');
      request.user = request.user ?? auth.user();
    } catch {
      // Auth provider not registered.
    }

    return readUserLocale(request.user);
  }

  private syncViewLocale(translator: Translator): void {
    try {
      const view = this.app.make<ViewEngine>('view');
      const apply = (): void => {
        const locale = translator.getLocale();
        view.setLocale(locale);
        view.setBindings({
          ...view.getRegistry().getBindings(),
          formatDate: (value: Date | string | number, options = {}) =>
            formatDate(value, locale, options),
          formatNumber: (value: number, options = {}) =>
            formatNumber(value, locale, options),
          formatCurrency: (value: number, currency: string, options = {}) =>
            formatCurrency(value, currency, locale, options),
        });
      };
      apply();
      this.app.use(async (_request, next) => {
        apply();
        try {
          return await next();
        } finally {
          apply();
        }
      });
    } catch {
      // View provider not registered.
    }
  }
}