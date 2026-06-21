const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export type EscapeHandler = (value: unknown) => string;

export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).replace(/[&<>"']/g, (char) => ESCAPE_MAP[char] ?? char);
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