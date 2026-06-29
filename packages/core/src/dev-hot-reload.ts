import { watch, type FSWatcher } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ConfigRepository, loadConfig } from '@pondoknusa/config';
import type { Application } from './application.js';

export interface DevHotReloadOptions {
  routeDirectory?: string;
}

function shouldReloadFile(filename: string | null): boolean {
  return filename !== null && /\.(ts|js|mjs)$/.test(filename);
}

function createDebounced(task: () => Promise<void>, delayMs = 150): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;

  return () => {
    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      if (running) {
        return;
      }

      running = true;
      void task()
        .catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`[hot-reload] ${message}`);
        })
        .finally(() => {
          running = false;
        });
    }, delayMs);
  };
}

async function listRouteModules(routeDirectory: string): Promise<string[]> {
  const entries = await readdir(routeDirectory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && shouldReloadFile(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => {
      const leftIsIndex = /^index\.(ts|js|mjs)$/.test(left);
      const rightIsIndex = /^index\.(ts|js|mjs)$/.test(right);
      if (leftIsIndex && !rightIsIndex) {
        return 1;
      }
      if (!leftIsIndex && rightIsIndex) {
        return -1;
      }
      return left.localeCompare(right);
    });

  return files.map((file) => join(routeDirectory, file));
}

export function startDevHotReload(
  app: Application,
  options: DevHotReloadOptions = {},
): { close: () => void } {
  if (process.env.PONDOKNUSA_HOT_RELOAD !== '1' || process.env.NODE_ENV === 'production') {
    return { close: () => {} };
  }

  const configDirectory = join(app.basePath, 'config');
  const routeDirectory = join(app.basePath, options.routeDirectory ?? 'src/routes');
  const watchers: FSWatcher[] = [];

  const reloadConfig = createDebounced(async () => {
    const config = await loadConfig(app.basePath, { validate: false });
    app.make<ConfigRepository>('config').replace(config);
    console.log('[hot-reload] Config reloaded');
  });

  const reloadRoutes = createDebounced(async () => {
    const modules = await listRouteModules(routeDirectory);
    app.router().resetRoutes();

    for (const modulePath of modules) {
      const url = `${pathToFileURL(modulePath).href}?hot=${Date.now()}`;
      await import(url);
    }

    console.log(`[hot-reload] Routes reloaded (${modules.length} modules)`);
  });

  watchers.push(watch(configDirectory, (_, filename) => {
    if (shouldReloadFile(filename)) {
      reloadConfig();
    }
  }));

  watchers.push(watch(routeDirectory, (_, filename) => {
    if (shouldReloadFile(filename)) {
      reloadRoutes();
    }
  }));

  const close = (): void => {
    for (const watcher of watchers) {
      watcher.close();
    }
  };

  process.once('SIGINT', close);
  process.once('SIGTERM', close);

  console.log('[hot-reload] Watching config/ and src/routes/ for changes');

  return { close };
}