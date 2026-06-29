import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { provider } from '../stubs.js';
import { parseOptions, positionalArgs, projectPath, toPascalCase, writeFile, pathExists } from '../utils.js';

export class MakeProviderCommand extends Command {
  override readonly name = 'make:provider';
  override readonly description = 'Create a new service provider class';
  override readonly usage = 'pondoknusa make:provider <Name>';

  async handle(args: string[]): Promise<number> {
    parseOptions(args);
    const [rawName] = positionalArgs(args);

    if (!rawName) {
      console.error('Provider name is required.');
      console.error('Usage: pondoknusa make:provider <Name>');
      return 1;
    }

    const root = await requireProjectRoot();
    const name = toPascalCase(rawName.replace(/ServiceProvider$/i, ''));
    const fileName = `${name}ServiceProvider.ts`;
    const target = projectPath(root, 'src/providers', fileName);

    if (await pathExists(target)) {
      console.error(`Provider already exists: src/providers/${fileName}`);
      return 1;
    }

    await writeFile(target, provider(name));
    console.log(`Provider created: src/providers/${fileName}`);
    console.log(`Register it in src/main.ts: app.register(${name}ServiceProvider);`);

    return 0;
  }
}