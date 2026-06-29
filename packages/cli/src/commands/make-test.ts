import { projectPath, writeFile, pathExists, parseOptions, positionalArgs } from '../utils.js';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { featureTestStub } from '../stubs-testing.js';

export class MakeTestCommand extends Command {
  override readonly name = 'make:test';
  override readonly description = 'Create a feature test class';
  override readonly usage = 'pondoknusa make:test <Name> [--feature]';

  async handle(args: string[]): Promise<number> {
    const options = parseOptions(args);
    const [name] = positionalArgs(args);

    if (!name) {
      console.error('Usage: pondoknusa make:test <Name> [--feature]');
      return 1;
    }

    const root = await requireProjectRoot();
    const className = name.endsWith('Test') ? name : `${name}Test`;
    const fileName = className.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    const target = projectPath(root, `tests/feature/${fileName}.ts`);
    const hasAuth = await pathExists(projectPath(root, 'config/auth.ts'));

    await writeFile(
      target,
      featureTestStub(className, {
        feature: options.feature === true,
        hasAuth,
      }),
    );
    console.log(`Created ${target}`);
    return 0;
  }
}