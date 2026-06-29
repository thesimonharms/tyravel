import { Command } from '../command.js';
import { registerIslandInClientBundle } from '../island-client-registry.js';
import { requireProjectRoot } from '../project.js';
import { islandClientMount, islandProgrammaticView, islandViewPartial } from '../stubs.js';
import { optionFlag, parseOptions, positionalArgs, projectPath, toKebabCase, writeFile, pathExists } from '../utils.js';

export class MakeIslandCommand extends Command {
  override readonly name = 'make:island';
  override readonly description = 'Scaffold a paired island view partial and client mount';
  override readonly usage = 'pondoknusa make:island <name> [--programmatic]';

  async handle(args: string[]): Promise<number> {
    const options = parseOptions(args);
    const [rawName] = positionalArgs(args);
    const programmatic = optionFlag(options, 'programmatic');

    if (!rawName) {
      console.error('Island name is required.');
      console.error('Usage: pondoknusa make:island <name>');
      return 1;
    }

    const root = await requireProjectRoot();
    const id = toKebabCase(rawName.replace(/\\/g, '/').split('/').pop() ?? rawName);
    if (programmatic) {
      const programmaticTarget = projectPath(root, 'resources/views/islands', `${id}.tyr.ts`);

      if (await pathExists(programmaticTarget)) {
        console.error(`Programmatic island already exists: resources/views/islands/${id}.tyr.ts`);
        return 1;
      }

      await writeFile(programmaticTarget, islandProgrammaticView(id));
      console.log(`Programmatic island created: resources/views/islands/${id}.tyr.ts`);
      console.log('');
      console.log(`Use in a view:`);
      console.log(`  @island('${id}', { count: 0, label: '${id}' })`);
      console.log(`  @endisland`);
      console.log('');
      console.log(`Register on the client:`);
      console.log(`  import * as ${id}Island from '../views/islands/${id}.tyr.js';`);
      console.log(`  registerProgrammaticIsland('${id}', ${id}Island);`);
      return 0;
    }

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