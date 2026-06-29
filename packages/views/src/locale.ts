import { readFileSync } from 'node:fs';

export {
  flattenTranslations,
  resolveLocalePath,
  type TranslationTree,
} from '@pondoknusa/locale';
import type { TranslationTree } from '@pondoknusa/locale';

/** Synchronous loader for the view compiler hot path. */
export function loadLocaleFile(path: string): TranslationTree {
  const source = readFileSync(path, 'utf8');
  const parsed = JSON.parse(source) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {};
  }
  return parsed as TranslationTree;
}

import type { Translator } from '@pondoknusa/locale';

export function translate(
  key: string,
  translations: Record<string, string>,
  replacements: Record<string, string | number> = {},
  fallback?: string,
  translator?: Translator,
): string {
  if (translator) {
    return translator.get(key, { replacements, fallback });
  }

  let message = translations[key] ?? fallback ?? key;
  for (const [name, value] of Object.entries(replacements)) {
    message = message.replaceAll(`:${name}`, String(value));
  }
  return message;
}