import { projectPath, writeFile } from '../utils.js';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { featureTestStub } from '../stubs-testing.js';

export class MakeTestCommand extends Command {
  override readonly name = 'make:test';
  override readonly description = 'Create a feature test class';
  override readonly usage = 'tyravel make:test <Name>';

  async handle(args: string[]): Promise<number> {
    const name = args[0];
    if (!name) {
      console.error('Usage: tyravel make:test <Name>');
      return 1;
    }

    const root = await requireProjectRoot();
    const className = name.endsWith('Test') ? name : `${name}Test`;
    const fileName = className.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    const target = projectPath(root, `tests/feature/${fileName}.ts`);

    await writeFile(target, featureTestStub(className));
    console.log(`Created ${target}`);
    return 0;
  }
}