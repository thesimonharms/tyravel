# Multi-locale applications

Serve translated UI and validation messages across locales.

## App config

```typescript
// config/app.ts
export default {
  locale: env('APP_LOCALE', 'en'),
  fallback_locale: env('APP_FALLBACK_LOCALE', 'en'),
  locales_path: 'lang',
  available_locales: ['en', 'de', 'fr'],
};
```

## Publish locale files

```bash
pondoknusa lang:publish
```

Creates `lang/en.json`. Copy to `lang/de.json`, `lang/fr.json`, etc.

## Views

```html
{{ __('messages.welcome') }}
```

`Lang` facade resolves keys from JSON locale files. See [Support utilities](/guide/support) for `Str` helpers.

## Missing keys

```bash
pondoknusa lang:missing
```

Reports keys used in views but absent from locale files — useful in CI.

## HTTP locale switching

Set locale per request in middleware:

```typescript
import { Lang } from '@pondoknusa/core';

Lang.setLocale(request.headers.get('Accept-Language')?.split(',')[0] ?? 'en');
```

Or derive from authenticated user preferences.

## Factories

`APP_FAKER_LOCALE` in `config/app.ts` controls factory-generated sample text.