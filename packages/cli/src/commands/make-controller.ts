import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import {
  apiResourceController,
  apiResourceRouteHint,
  controller,
  invokableController,
} from '../stubs.js';
import { parseOptions, positionalArgs, projectPath, toPascalCase, writeFile, pathExists } from '../utils.js';

export class MakeControllerCommand extends Command {
  override readonly name = 'make:controller';
  override readonly description = 'Create a new HTTP controller class';
  override readonly usage =
    'pondoknusa make:controller <Name> [--api] [--invokable]';

  async handle(args: string[]): Promise<number> {
    const options = parseOptions(args);
    const [rawName] = positionalArgs(args);

    if (!rawName) {
      console.error('Controller name is required.');
      console.error('Usage: pondoknusa make:controller <Name> [--api] [--invokable]');
      return 1;
    }

    const root = await requireProjectRoot();
    const name = toPascalCase(rawName.replace(/Controller$/i, ''));
    const fileName = `${name}Controller.ts`;
    const target = projectPath(root, 'src/controllers', fileName);
    const api = options.api === true;
    const invokable = options.invokable === true;

    if (await pathExists(target)) {
      console.error(`Controller already exists: src/controllers/${fileName}`);
      return 1;
    }

    const contents = api
      ? invokable
        ? invokableController(name)
        : apiResourceController(name)
      : invokable
        ? invokableController(name)
        : controller(name);

    await writeFile(target, contents);
    console.log(`Controller created: src/controllers/${fileName}`);

    if (api) {
      console.log('');
      console.log('Suggested routes:');
      console.log(apiResourceRouteHint(name, invokable));
    }

    return 0;
  }
}