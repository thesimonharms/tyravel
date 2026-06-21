import { readFileSync } from 'node:fs';

export interface ViteManifestEntry {
  file: string;
  css?: string[];
  imports?: string[];
}

export type ViteManifest = Record<string, ViteManifestEntry>;

export function readViteManifest(path: string): ViteManifest {
  try {
    const source = readFileSync(path, 'utf8');
    const parsed = JSON.parse(source) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return parsed as ViteManifest;
  } catch {
    return {};
  }
}

export function renderViteTags(
  manifest: ViteManifest,
  entry: string,
  base = '/build',
): string {
  const chunk = manifest[entry];
  if (!chunk) {
    return '';
  }

  const normalizedBase = base.replace(/\/$/, '');
  const tags: string[] = [];

  for (const cssFile of chunk.css ?? []) {
    tags.push(`<link rel="stylesheet" href="${normalizedBase}/${cssFile}">`);
  }

  tags.push(`<script type="module" src="${normalizedBase}/${chunk.file}"></script>`);
  return tags.join('\n');
}