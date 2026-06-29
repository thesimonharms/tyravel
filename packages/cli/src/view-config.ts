import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DEFAULT_VIEW_CONFIG, ViewEngine, type ViewConfig } from '@pondoknusa/views';

export { DEFAULT_VIEW_CONFIG };

export async function loadViewConfig(root: string): Promise<ViewConfig> {
  const configPath = join(root, 'config/views.ts');
  const configJsPath = join(root, 'config/views.js');

  for (const target of [configJsPath, configPath]) {
    try {
      const { access } = await import('node:fs/promises');
      await access(target);
      const loaded = await import(pathToFileURL(target).href);
      return { ...DEFAULT_VIEW_CONFIG, ...(loaded.default as ViewConfig) };
    } catch {
      continue;
    }
  }

  return DEFAULT_VIEW_CONFIG;
}

export function createViewEngine(root: string, viewConfig: ViewConfig): ViewEngine {
  return new ViewEngine(root, viewConfig);
}