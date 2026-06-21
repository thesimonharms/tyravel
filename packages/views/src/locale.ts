import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type TranslationTree = Record<string, unknown>;

export function loadLocaleFile(path: string): TranslationTree {
  const source = readFileSync(path, 'utf8');
  const parsed = JSON.parse(source) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {};
  }
  return parsed as TranslationTree;
}

export function flattenTranslations(
  tree: TranslationTree,
  prefix = '',
): Record<string, string> {
  const flat: Record<string, string> = {};

  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      flat[path] = value;
      continue;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(flat, flattenTranslations(value as TranslationTree, path));
    }
  }

  return flat;
}

export function translate(
  key: string,
  translations: Record<string, string>,
  replacements: Record<string, string | number> = {},
  fallback?: string,
): string {
  let message = translations[key] ?? fallback ?? key;

  for (const [name, value] of Object.entries(replacements)) {
    message = message.replaceAll(`:${name}`, String(value));
  }

  return message;
}

export function resolveLocalePath(
  basePath: string,
  localesPath: string,
  locale: string,
): string {
  return join(basePath, localesPath, `${locale}.json`);
}