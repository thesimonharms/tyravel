import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { seeder } from '../stubs.js';
import { parseOptions, positionalArgs, projectPath, toKebabCase, toPascalCase, writeFile, pathExists } from '../utils.js';

export class MakeSeederCommand extends Command {
  override readonly name = 'make:seeder';
  override readonly description = 'Create a new database seeder class';
  override readonly usage = 'pondoknusa make:seeder <Name>';

  async handle(args: string[]): Promise<number> {
    parseOptions(args);
    const [rawName] = positionalArgs(args);

    if (!rawName) {
      console.error('Seeder name is required.');
      console.error('Usage: pondoknusa make:seeder <Name>');
      return 1;
    }

    const root = await requireProjectRoot();
    const className = `${toPascalCase(rawName)}Seeder`;
    const fileName = `${toKebabCase(className)}.ts`;
    const target = projectPath(root, 'database/seeders', fileName);

    if (await pathExists(target)) {
      console.error(`Seeder already exists: database/seeders/${fileName}`);
      return 1;
    }

    await writeFile(target, seeder(className));
    console.log(`Seeder created: database/seeders/${fileName}`);

    return 0;
  }
}