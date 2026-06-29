import { generateViewPropsDeclarationFile } from '@pondoknusa/views';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { parseOptions, positionalArgs, writeFile } from '../utils.js';
import { bootViewApplication } from '../view-bootstrap.js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const DEFAULT_OUTPUT = 'types/view-props.generated.d.ts';

export class ViewTypesCommand extends Command {
  override readonly name = 'view:types';
  override readonly description = 'Generate ViewPropsMap types from @props directives';
  override readonly usage = 'pondoknusa view:types [--output=types/view-props.generated.d.ts] [--check]';

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

    if (options.check) {
      let existing = '';
      try {
        existing = await readFile(outputPath, 'utf8');
      } catch {
        console.error(`Missing ${outputPath}. Run pondoknusa view:types to generate it.`);
        return 1;
      }

      if (existing !== contents) {
        console.error('View prop types are out of date. Run pondoknusa view:types and commit the changes.');
        return 1;
      }

      console.log(`View prop types are up to date (${Object.keys(entries).length} view(s)).`);
      return 0;
    }

    await writeFile(outputPath, contents);

    const count = Object.keys(entries).length;
    console.log(`Generated ViewPropsMap for ${count} view(s) at ${outputPath}.`);

    return 0;
  }
}