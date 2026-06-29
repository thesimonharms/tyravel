import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import { compile, type CompileOptions } from './compiler.js';
import {
  cacheFileForView,
  writeCompiledCache,
  type SerializedCacheEntry,
} from './compiled-cache.js';
import type { CompiledTemplate } from './types.js';

function resolveWorkerScript(): string {
  const directory = dirname(fileURLToPath(import.meta.url));
  const compiledWorker = join(directory, 'compile-worker.js');
  if (!existsSync(compiledWorker)) {
    throw new Error('compile-worker.js is not built. Run npm run build in @pondoknusa/views.');
  }

  return compiledWorker;
}

export function isWorkerCompileAvailable(): boolean {
  const directory = dirname(fileURLToPath(import.meta.url));
  return existsSync(join(directory, 'compile-worker.js'));
}

export interface ParallelCompileJob {
  name: string;
  sourcePath: string;
  compileOptions: CompileOptions;
}

export async function compileViewsInWorkerPool(
  jobs: ParallelCompileJob[],
  options: {
    cacheDirectory: string;
    viewsRoot: string;
    registryVersion: number;
    workers?: number;
  },
): Promise<number> {
  if (jobs.length === 0) {
    return 0;
  }

  const workerCount = Math.max(
    1,
    Math.min(options.workers ?? availableParallelism(), jobs.length),
  );
  const queue = [...jobs];
  let warmed = 0;

  const runWorker = async (): Promise<void> => {
    while (queue.length > 0) {
      const job = queue.shift();
      if (!job) {
        return;
      }

      const source = await readFile(job.sourcePath, 'utf8');
      const template = isWorkerCompileAvailable()
        ? await compileInWorker(source, job.compileOptions)
        : compile(source, job.compileOptions);
      const fileStats = await stat(job.sourcePath);
      const entry: SerializedCacheEntry = {
        mtimeMs: fileStats.mtimeMs,
        registryVersion: options.registryVersion,
        template,
      };
      const cacheFile = cacheFileForView(
        options.cacheDirectory,
        options.viewsRoot,
        job.sourcePath,
      );
      await writeCompiledCache(cacheFile, entry);
      warmed += 1;
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return warmed;
}

function compileInWorker(
  source: string,
  compileOptions: CompileOptions,
): Promise<CompiledTemplate> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(resolveWorkerScript(), {
      workerData: { source, options: compileOptions },
    });

    worker.once('message', (message: { ok: boolean; template?: CompiledTemplate; error?: string }) => {
      worker.terminate().catch(() => undefined);
      if (message.ok && message.template) {
        resolve(message.template);
        return;
      }

      reject(new Error(message.error ?? 'View compile worker failed'));
    });

    worker.once('error', (error) => {
      worker.terminate().catch(() => undefined);
      reject(error);
    });
  });
}