const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export type EscapeHandler = (value: unknown) => string;

const HTML_ESCAPE_PATTERN = /[&<>"']/;

export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);
  if (!HTML_ESCAPE_PATTERN.test(str)) {
    return str;
  }

  return str.replace(/[&<>"']/g, (char) => ESCAPE_MAP[char] ?? char);
}

export function escapeUrl(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  return encodeURIComponent(String(value));
}

export function escapeJs(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function escapeCss(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).replace(/["'\\]/g, '\\$&');
}

export const BUILTIN_ESCAPE_CONTEXTS: Record<string, EscapeHandler> = {
  html: escapeHtml,
  url: escapeUrl,
  js: escapeJs,
  css: escapeCss,
};