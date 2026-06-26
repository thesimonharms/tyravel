import { generateViewPropsDeclarationFile } from '@tyravel/views';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { parseOptions, positionalArgs, writeFile } from '../utils.js';
import { bootViewApplication } from '../view-bootstrap.js';
import { join } from 'node:path';

const DEFAULT_OUTPUT = 'types/view-props.generated.d.ts';

export class ViewTypesCommand extends Command {
  override readonly name = 'view:types';
  override readonly description = 'Generate ViewPropsMap types from @props directives';
  override readonly usage = 'tyravel view:types [--output=types/view-props.generated.d.ts]';

  async handle(args: string[]): Promise<number> {
    const options = parseOptions(args);
    positionalArgs(args);

    const root = await requireProjectRoot();
    const { engine } = await bootViewApplication(root);
    const outputPath = join(
      root,
      typeof options.output === 'string' ? options.output : DEFAULT_OUTPUT,
    );

    const entries: Record<string, Record<string, unknown>> = {};

    for (const name of await engine.listViewNames()) {
      const template = await engine.getCompiledTemplate(name);
      if (template.props && Object.keys(template.props).length > 0) {
        entries[name] = template.props;
      }
    }

    const contents = generateViewPropsDeclarationFile(entries);
    await writeFile(outputPath, contents);

    const count = Object.keys(entries).length;
    console.log(`Generated ViewPropsMap for ${count} view(s) at ${outputPath}.`);

    return 0;
  }
}