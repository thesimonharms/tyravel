export const PONDOKNUSA_DOCS_ORIGIN = 'https://pondoknusa.dev';

export function docsLink(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${PONDOKNUSA_DOCS_ORIGIN}${normalized}`;
}