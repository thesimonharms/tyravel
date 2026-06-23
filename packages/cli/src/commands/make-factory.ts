import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { factory } from '../stubs.js';
import { parseOptions, positionalArgs, projectPath, toKebabCase, toPascalCase, writeFile, pathExists } from '../utils.js';

export class MakeFactoryCommand extends Command {
  override readonly name = 'make:factory';
  override readonly description = 'Create a new model factory class';
  override readonly usage = 'tyravel make:factory <Model>';

  async handle(args: string[]): Promise<number> {
    parseOptions(args);
    const [rawName] = positionalArgs(args);

    if (!rawName) {
      console.error('Model name is required.');
      console.error('Usage: tyravel make:factory <Model>');
      return 1;
    }

    const root = await requireProjectRoot();
    const modelName = toPascalCase(rawName);
    const fileName = `${toKebabCase(modelName)}-factory.ts`;
    const target = projectPath(root, 'database/factories', fileName);

    if (await pathExists(target)) {
      console.error(`Factory already exists: database/factories/${fileName}`);
      return 1;
    }

    await writeFile(target, factory(modelName));
    console.log(`Factory created: database/factories/${fileName}`);

    return 0;
  }
}