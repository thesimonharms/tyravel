import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import type { CompiledTemplate } from './types.js';

export interface SerializedCacheEntry {
  mtimeMs: number;
  registryVersion: number;
  template: CompiledTemplate;
}

export function cacheFileForView(
  cacheDirectory: string,
  viewsRoot: string,
  sourcePath: string,
): string {
  const relativePath = relative(viewsRoot, sourcePath);
  const hash = createHash('sha256').update(relativePath).digest('hex');
  return join(cacheDirectory, `${hash}.json`);
}

export async function readCompiledCache(
  cacheFile: string,
): Promise<SerializedCacheEntry | null> {
  try {
    const raw = await readFile(cacheFile, 'utf8');
    return JSON.parse(raw) as SerializedCacheEntry;
  } catch {
    return null;
  }
}

/**
 * @deprecated Use `await readCompiledCache()` instead. Removed in 1.0.0.
 */
export function readCompiledCacheSync(cacheFile: string): SerializedCacheEntry | null {
  try {
    const raw = readFileSync(cacheFile, 'utf8');
    return JSON.parse(raw) as SerializedCacheEntry;
  } catch {
    return null;
  }
}

export async function writeCompiledCache(
  cacheFile: string,
  entry: SerializedCacheEntry,
): Promise<void> {
  await mkdir(dirname(cacheFile), { recursive: true });
  await writeFile(cacheFile, JSON.stringify(entry), 'utf8');
}

/**
 * @deprecated Use `await writeCompiledCache()` instead. Removed in 1.0.0.
 */
export function writeCompiledCacheSync(cacheFile: string, entry: SerializedCacheEntry): void {
  mkdirSync(dirname(cacheFile), { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(entry), 'utf8');
}

export async function clearCompiledCacheDir(cacheDirectory: string): Promise<number> {
  try {
    const entries = await readdir(cacheDirectory);
    let removed = 0;

    for (const entry of entries) {
      if (!entry.endsWith('.json')) {
        continue;
      }
      await rm(join(cacheDirectory, entry));
      removed += 1;
    }

    return removed;
  } catch {
    return 0;
  }
}

/**
 * @deprecated Use `await clearCompiledCacheDir()` instead. Removed in 1.0.0.
 */
export function clearCompiledCacheDirSync(cacheDirectory: string): number {
  if (!existsSync(cacheDirectory)) {
    return 0;
  }

  let removed = 0;
  for (const entry of readdirSync(cacheDirectory)) {
    if (!entry.endsWith('.json')) {
      continue;
    }
    rmSync(join(cacheDirectory, entry));
    removed += 1;
  }
  return removed;
}

export async function discoverViewNames(
  viewsDirectory: string,
  extension: string,
  prefix = '',
): Promise<string[]> {
  let entries: import('node:fs').Dirent[];
  try {
    entries = await readdir(viewsDirectory, { withFileTypes: true });
  } catch {
    return [];
  }

  const names: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const nestedPrefix = prefix ? `${prefix}.${entry.name}` : entry.name;
      names.push(
        ...(await discoverViewNames(
          join(viewsDirectory, entry.name),
          extension,
          nestedPrefix,
        )),
      );
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(extension)) {
      continue;
    }

    const baseName = entry.name.slice(0, -extension.length);
    names.push(prefix ? `${prefix}.${baseName}` : baseName);
  }

  return names.sort();
}

/**
 * @deprecated Use `await discoverViewNames()` instead. Removed in 1.0.0.
 */
export function discoverViewNamesSync(
  viewsDirectory: string,
  extension: string,
  prefix = '',
): string[] {
  if (!existsSync(viewsDirectory)) {
    return [];
  }

  const names: string[] = [];

  for (const entry of readdirSync(viewsDirectory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const nestedPrefix = prefix ? `${prefix}.${entry.name}` : entry.name;
      names.push(
        ...discoverViewNamesSync(join(viewsDirectory, entry.name), extension, nestedPrefix),
      );
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(extension)) {
      continue;
    }

    const baseName = entry.name.slice(0, -extension.length);
    names.push(prefix ? `${prefix}.${baseName}` : baseName);
  }

  return names.sort();
}