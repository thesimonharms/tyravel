import { serializeViewCatalog } from '@tyravel/views';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { parseOptions, positionalArgs } from '../utils.js';
import { bootViewApplication } from '../view-bootstrap.js';

export class ViewCatalogCommand extends Command {
  override readonly name = 'view:catalog';
  override readonly description = 'Export component and island catalog metadata';
  override readonly usage = 'tyravel view:catalog [--json]';

  async handle(args: string[]): Promise<number> {
    const options = parseOptions(args);
    positionalArgs(args);

    const root = await requireProjectRoot();
    const { engine } = await bootViewApplication(root);
    const catalog = serializeViewCatalog(engine.getViewCatalog());

    if (options.json) {
      console.log(JSON.stringify(catalog, null, 2));
      return 0;
    }

    if (catalog.components.length === 0 && catalog.islands.length === 0) {
      console.log('No components or islands discovered.');
      return 0;
    }

    for (const component of catalog.components) {
      const slots = component.slots.length > 0 ? component.slots.join(', ') : 'default';
      const props = component.propsSchema
        .map((prop) => (prop.required ? prop.name : `${prop.name}?`))
        .join(', ');
      console.log(`${component.name}  props=[${props}]  slots=[${slots}]`);
    }

    for (const island of catalog.islands) {
      const mounts = [
        island.hasClientMount ? 'client' : null,
        island.hasProgrammaticMount ? 'programmatic' : null,
      ]
        .filter(Boolean)
        .join(', ');
      console.log(`${island.id}  views=[${island.views.join(', ')}]  mounts=[${mounts}]`);
    }

    return 0;
  }
}