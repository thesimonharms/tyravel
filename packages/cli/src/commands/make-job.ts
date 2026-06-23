import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { job } from '../stubs.js';
import { parseOptions, positionalArgs, projectPath, toPascalCase, writeFile, pathExists } from '../utils.js';

export class MakeJobCommand extends Command {
  override readonly name = 'make:job';
  override readonly description = 'Create a new queue job class';
  override readonly usage = 'tyravel make:job <Name>';

  async handle(args: string[]): Promise<number> {
    parseOptions(args);
    const [rawName] = positionalArgs(args);

    if (!rawName) {
      console.error('Job name is required.');
      console.error('Usage: tyravel make:job <Name>');
      return 1;
    }

    const root = await requireProjectRoot();
    const name = toPascalCase(rawName);
    const fileName = `${name}.ts`;
    const target = projectPath(root, 'src/jobs', fileName);

    if (await pathExists(target)) {
      console.error(`Job already exists: src/jobs/${fileName}`);
      return 1;
    }

    await writeFile(target, job(name));
    console.log(`Job created: src/jobs/${fileName}`);
    console.log('Register it in AppServiceProvider with jobs.registry.register(...)');

    return 0;
  }
}