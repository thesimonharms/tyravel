import { existsSync } from 'node:fs';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { eventSubscriber } from '../stubs.js';
import {
  parseOptions,
  positionalArgs,
  projectPath,
  toPascalCase,
  writeFile,
} from '../utils.js';

export class MakeSubscriberCommand extends Command {
  override readonly name = 'make:subscriber';
  override readonly description = 'Create an event subscriber class';
  override readonly usage = 'tyravel make:subscriber <Name>';

  async handle(args: string[]): Promise<number> {
    parseOptions(args);
    const [name] = positionalArgs(args);

    if (!name) {
      console.error('Subscriber name is required.');
      return 1;
    }

    const className = toPascalCase(name);
    const root = requireProjectRoot();
    const target = projectPath(root, 'src/subscribers', `${className}.ts`);

    if (existsSync(target)) {
      console.error(`Subscriber already exists: src/subscribers/${className}.ts`);
      return 1;
    }

    writeFile(target, eventSubscriber(className));
    console.log(`Subscriber created: src/subscribers/${className}.ts`);
    console.log(`Register it in config/events.ts subscribers: [${className}]`);

    return 0;
  }
}