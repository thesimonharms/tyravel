import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { eventListener } from '../stubs.js';
import { parseOptions, positionalArgs, projectPath, toPascalCase, writeFile, pathExists } from '../utils.js';

export class MakeListenerCommand extends Command {
  override readonly name = 'make:listener';
  override readonly description = 'Create a new event listener class';
  override readonly usage = 'tyravel make:listener <Name>';

  async handle(args: string[]): Promise<number> {
    parseOptions(args);
    const [rawName] = positionalArgs(args);

    if (!rawName) {
      console.error('Listener name is required.');
      console.error('Usage: tyravel make:listener <Name>');
      return 1;
    }

    const root = await requireProjectRoot();
    const name = toPascalCase(rawName);
    const fileName = `${name}.ts`;
    const target = projectPath(root, 'src/listeners', fileName);

    if (await pathExists(target)) {
      console.error(`Listener already exists: src/listeners/${fileName}`);
      return 1;
    }

    await writeFile(target, eventListener(name));
    console.log(`Listener created: src/listeners/${fileName}`);
    console.log('Register it in config/events.ts or with Events.listen(...)');

    return 0;
  }
}