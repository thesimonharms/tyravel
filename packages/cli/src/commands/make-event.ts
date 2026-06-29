import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { domainEvent } from '../stubs.js';
import { parseOptions, positionalArgs, projectPath, toPascalCase, writeFile, pathExists } from '../utils.js';

export class MakeEventCommand extends Command {
  override readonly name = 'make:event';
  override readonly description = 'Create a new domain event class';
  override readonly usage = 'pondoknusa make:event <Name>';

  async handle(args: string[]): Promise<number> {
    parseOptions(args);
    const [rawName] = positionalArgs(args);

    if (!rawName) {
      console.error('Event name is required.');
      console.error('Usage: pondoknusa make:event <Name>');
      return 1;
    }

    const root = await requireProjectRoot();
    const name = toPascalCase(rawName);
    const fileName = `${name}.ts`;
    const target = projectPath(root, 'src/events', fileName);

    if (await pathExists(target)) {
      console.error(`Event already exists: src/events/${fileName}`);
      return 1;
    }

    await writeFile(target, domainEvent(name));
    console.log(`Event created: src/events/${fileName}`);

    return 0;
  }
}