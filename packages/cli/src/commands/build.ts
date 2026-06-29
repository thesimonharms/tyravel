import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { Command } from '../command.js';
import { loadProjectConfig, requireProjectRoot } from '../project.js';
import { optionString, parseOptions, pathExists, positionalArgs } from '../utils.js';

export class BuildCommand extends Command {
  override readonly name = 'build';
  override readonly description = 'Bundle the app entry into a single production file (esbuild)';
  override readonly usage = 'pondoknusa build [--outfile=<path>] [--minify]';

  async handle(args: string[]): Promise<number> {
    const options = parseOptions(args);
    positionalArgs(args);

    const root = await requireProjectRoot();
    const config = await loadProjectConfig(root);
    const entry = join(root, config.entry);

    if (!(await pathExists(entry))) {
      console.error(`Entry file not found: ${config.entry}`);
      return 1;
    }

    let esbuild: {
      build: (options: Record<string, unknown>) => Promise<{ errors: unknown[] }>;
    };
    try {
      esbuild = (await import('esbuild')) as typeof esbuild;
    } catch {
      console.error(
        'esbuild is required for pondoknusa build. Install it in your app: npm install -D esbuild',
      );
      return 1;
    }

    const outfile = resolve(
      root,
      optionString(options, 'outfile', 'bootstrap/app.mjs') ?? 'bootstrap/app.mjs',
    );
    const minify = options.minify === true || options.minify === 'true';

    await mkdir(dirname(outfile), { recursive: true });

    const result = await esbuild.build({
      entryPoints: [entry],
      outfile,
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'node26',
      minify,
      sourcemap: true,
      packages: 'external',
      banner: {
        js: '// Pondoknusa production bundle — see docs/guide/performance.md#single-file-bundle',
      },
    });

    if (result.errors.length > 0) {
      console.error('Build failed.');
      return 1;
    }

    const readme = join(dirname(outfile), 'README.txt');
    await writeFile(
      readme,
      [
        'Pondoknusa production bundle',
        '',
        'Run: node bootstrap/app.mjs',
        '',
        'Trade-offs:',
        '- Faster cold start on edge runtimes; no per-request TypeScript compile.',
        '- Native addons and dynamic imports may need extra esbuild plugins.',
        '- Run pondoknusa config:cache, route:cache, and view:cache before bundling.',
        '',
      ].join('\n'),
      'utf8',
    );

    console.log(`Bundled ${config.entry} → ${outfile}`);
    return 0;
  }
}