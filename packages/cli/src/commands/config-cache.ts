import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildConfigCacheManifest, configCachePath, loadEnv } from '@pondoknusa/config';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { parseOptions, positionalArgs } from '../utils.js';

export class ConfigCacheCommand extends Command {
  override readonly name = 'config:cache';
  override readonly description = 'Serialize merged config for production boot';
  override readonly usage = 'pondoknusa config:cache';

  async handle(args: string[]): Promise<number> {
    parseOptions(args);
    positionalArgs(args);

    const root = await requireProjectRoot();
    await loadEnv(root);
    const manifest = await buildConfigCacheManifest(root);

    const targetDir = join(root, 'storage', 'framework');
    await mkdir(targetDir, { recursive: true });
    await writeFile(
      configCachePath(root),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    );

    console.log(
      `Cached config from ${manifest.files.length} source file(s) to storage/framework/config.json`,
    );
    return 0;
  }
}

export class ConfigClearCommand extends Command {
  override readonly name = 'config:clear';
  override readonly description = 'Remove the cached config manifest';
  override readonly usage = 'pondoknusa config:clear';

  async handle(args: string[]): Promise<number> {
    parseOptions(args);
    positionalArgs(args);

    const root = await requireProjectRoot();
    const target = configCachePath(root);

    try {
      await unlink(target);
      console.log('Config cache cleared.');
    } catch {
      console.log('No config cache found.');
    }

    return 0;
  }
}