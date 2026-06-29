import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { frameworkCatalogPath } from '@pondoknusa/locale';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { defaultLocaleFile } from '../stubs.js';
import { parseOptions, pathExists, projectPath, writeFile } from '../utils.js';

export class LangPublishCommand extends Command {
  override readonly name = 'lang:publish';
  override readonly description = 'Publish application locale files';
  override readonly usage = 'pondoknusa lang:publish [--locale=en] [--framework]';

  async handle(args: string[]): Promise<number> {
    const options = parseOptions(args);
    const root = await requireProjectRoot();
    const locale = String(options.locale ?? 'en');
    const publishFramework = options.framework === true;

    const langDir = projectPath(root, 'lang');
    await mkdir(langDir, { recursive: true });

    const appLocalePath = join(langDir, `${locale}.json`);
    if (!(await pathExists(appLocalePath))) {
      await writeFile(appLocalePath, `${defaultLocaleFile()}\n`);
      console.log(`Created lang/${locale}.json`);
    } else {
      console.log(`lang/${locale}.json already exists — skipped.`);
    }

    if (publishFramework) {
      const frameworkSource = frameworkCatalogPath(locale);
      const frameworkTarget = join(langDir, `${locale}.framework.json`);
      await mkdir(dirname(frameworkTarget), { recursive: true });
      await copyFile(frameworkSource, frameworkTarget);
      console.log(`Published framework catalog to lang/${locale}.framework.json`);
    }

    return 0;
  }
}