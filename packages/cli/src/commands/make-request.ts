import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { formRequest } from '../stubs.js';
import { parseOptions, positionalArgs, projectPath, toPascalCase, writeFile, pathExists } from '../utils.js';

export class MakeRequestCommand extends Command {
  override readonly name = 'make:request';
  override readonly description = 'Create a new form request class';
  override readonly usage = 'pondoknusa make:request <Name>';

  async handle(args: string[]): Promise<number> {
    parseOptions(args);
    const [rawName] = positionalArgs(args);

    if (!rawName) {
      console.error('Request name is required.');
      console.error('Usage: pondoknusa make:request <Name>');
      return 1;
    }

    const root = await requireProjectRoot();
    const baseName = toPascalCase(rawName.replace(/Request$/i, ''));
    const className = `${baseName}Request`;
    const fileName = `${className}.ts`;
    const target = projectPath(root, 'src/requests', fileName);

    if (await pathExists(target)) {
      console.error(`Form request already exists: src/requests/${fileName}`);
      return 1;
    }

    await writeFile(target, formRequest(className));
    console.log(`Form request created: src/requests/${fileName}`);

    return 0;
  }
}