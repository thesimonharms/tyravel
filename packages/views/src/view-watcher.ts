import { watch, type FSWatcher } from 'node:fs';
import { join } from 'node:path';
import type { ViewEngine } from './view-engine.js';

export interface ViewWatcherOptions {
  onRecompiled?: (viewName: string) => void;
  onError?: (error: Error) => void;
}

export interface ViewWatcher {
  close(): void;
}

export function createViewWatcher(
  engine: ViewEngine,
  options: ViewWatcherOptions = {},
): ViewWatcher {
  const extensions = new Set(engine.getWatchedExtensions());
  const roots = engine.getViewRoots();
  const watchers: FSWatcher[] = [];
  const pending = new Map<string, NodeJS.Timeout>();

  const scheduleRecompile = (filePath: string, root: string): void => {
    const existing = pending.get(filePath);
    if (existing) {
      clearTimeout(existing);
    }

    pending.set(
      filePath,
      setTimeout(() => {
        pending.delete(filePath);
        try {
          const viewName = engine.viewNameFromPath(filePath, root);
          engine.invalidateTemplate(viewName);
          if (!filePath.endsWith(engine.getProgrammaticExtension())) {
            void engine.recompileTemplate(viewName).catch((error) => {
              if (error instanceof Error) {
                options.onError?.(error);
              }
            });
          }
          options.onRecompiled?.(viewName);
        } catch (error) {
          if (error instanceof Error) {
            options.onError?.(error);
          }
        }
      }, 50),
    );
  };

  const matchesExtension = (fileName: string): boolean => {
    for (const extension of extensions) {
      if (fileName.endsWith(extension)) {
        return true;
      }
    }
    return false;
  };

  for (const root of roots) {
    const watcher = watch(
      root,
      { recursive: true },
      (_eventType, fileName) => {
        if (!fileName || !matchesExtension(fileName.toString())) {
          return;
        }
        scheduleRecompile(join(root, fileName.toString()), root);
      },
    );

    watcher.on('error', (error) => {
      if (error instanceof Error) {
        options.onError?.(error);
      }
    });

    watchers.push(watcher);
  }

  return {
    close() {
      for (const timeout of pending.values()) {
        clearTimeout(timeout);
      }
      pending.clear();
      for (const watcher of watchers) {
        watcher.close();
      }
    },
  };
}