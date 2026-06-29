import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { view } from '../stubs.js';
import { parseOptions, positionalArgs, projectPath, toKebabCase, writeFile, pathExists } from '../utils.js';

export class MakeViewCommand extends Command {
  override readonly name = 'make:view';
  override readonly description = 'Create a new Tyr template view';
  override readonly usage = 'pondoknusa make:view <name>';

  async handle(args: string[]): Promise<number> {
    parseOptions(args);
    const [rawName] = positionalArgs(args);

    if (!rawName) {
      console.error('View name is required.');
      console.error('Usage: pondoknusa make:view <name>');
      return 1;
    }

    const root = await requireProjectRoot();
    const dotted = rawName.replace(/\\/g, '/').replace(/\/+/g, '.');
    const segments = dotted.split('.').map((segment) => toKebabCase(segment));
    const fileName = `${segments.at(-1)}.tyr`;
    const directory = segments.slice(0, -1);
    const relativeDir = ['resources', 'views', ...directory].join('/');
    const target = projectPath(root, relativeDir, fileName);

    if (await pathExists(target)) {
      console.error(`View already exists: ${relativeDir}/${fileName}`);
      return 1;
    }

    await writeFile(target, view(segments.join('.')));
    console.log(`View created: ${relativeDir}/${fileName}`);

    return 0;
  }
}