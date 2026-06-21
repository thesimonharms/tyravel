import { existsSync } from 'node:fs';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { apiResource } from '../stubs.js';
import {
  parseOptions,
  positionalArgs,
  projectPath,
  toPascalCase,
  writeFile,
} from '../utils.js';

export class MakeResourceCommand extends Command {
  override readonly name = 'make:resource';
  override readonly description = 'Create a new API resource class';
  override readonly usage = 'tyravel make:resource <Name>';

  async handle(args: string[]): Promise<number> {
    parseOptions(args);
    const [rawName] = positionalArgs(args);

    if (!rawName) {
      console.error('Resource name is required.');
      console.error('Usage: tyravel make:resource <Name>');
      return 1;
    }

    const root = requireProjectRoot();
    const baseName = toPascalCase(rawName.replace(/Resource$/i, ''));
    const className = `${baseName}Resource`;
    const fileName = `${className}.ts`;
    const target = projectPath(root, 'src/resources', fileName);

    if (existsSync(target)) {
      console.error(`API resource already exists: src/resources/${fileName}`);
      return 1;
    }

    writeFile(target, apiResource(className));
    console.log(`API resource created: src/resources/${fileName}`);

    return 0;
  }
}