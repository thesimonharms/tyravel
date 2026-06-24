import { Command } from '../command.js';
import { registerIslandInClientBundle } from '../island-client-registry.js';
import { requireProjectRoot } from '../project.js';
import { islandClientMount, islandViewPartial } from '../stubs.js';
import { parseOptions, positionalArgs, projectPath, toKebabCase, writeFile, pathExists } from '../utils.js';

export class MakeIslandCommand extends Command {
  override readonly name = 'make:island';
  override readonly description = 'Scaffold a paired island view partial and client mount';
  override readonly usage = 'tyravel make:island <name>';

  async handle(args: string[]): Promise<number> {
    parseOptions(args);
    const [rawName] = positionalArgs(args);

    if (!rawName) {
      console.error('Island name is required.');
      console.error('Usage: tyravel make:island <name>');
      return 1;
    }

    const root = await requireProjectRoot();
    const id = toKebabCase(rawName.replace(/\\/g, '/').split('/').pop() ?? rawName);
    const viewTarget = projectPath(root, 'resources/views/islands', `${id}.tyr`);
    const clientTarget = projectPath(root, 'resources/client/islands', `${id}.ts`);

    if (await pathExists(viewTarget)) {
      console.error(`Island view already exists: resources/views/islands/${id}.tyr`);
      return 1;
    }

    if (await pathExists(clientTarget)) {
      console.error(`Island client mount already exists: resources/client/islands/${id}.ts`);
      return 1;
    }

    await writeFile(viewTarget, islandViewPartial(id));
    await writeFile(clientTarget, islandClientMount(id));

    if (await registerIslandInClientBundle(root, id)) {
      console.log(`Registered resources/client/islands/${id}.ts in the client bundle`);
    }

    console.log(`Island created: resources/views/islands/${id}.tyr`);
    console.log(`Island mount created: resources/client/islands/${id}.ts`);
    console.log('');
    console.log(`Use in a view:`);
    console.log(`  @island('${id}', { /* props */ })`);
    console.log(`    @include('islands.${id}')`);
    console.log(`  @endisland`);

    return 0;
  }
}