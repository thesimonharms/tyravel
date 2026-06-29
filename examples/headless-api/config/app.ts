import { env, s } from '@pondoknusa/config';

export const schema = s.object({
  name: s.string({ required: true, minLength: 1 }),
  headless: s.boolean(),
  debug: s.boolean(),
  url: s.string({ url: true }),
});

export default {
  name: env('APP_NAME', 'headless-api'),
  headless: true,
  debug: env('APP_DEBUG', true),
  url: env('APP_URL', 'http://127.0.0.1:3000'),
  locale: env('APP_LOCALE', 'en'),
  fallback_locale: env('APP_FALLBACK_LOCALE', 'en'),
  faker_locale: env('APP_FAKER_LOCALE', 'en'),
} as const;
