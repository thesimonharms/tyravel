import { readFile } from 'node:fs/promises';
import { lintHasErrors, lintViewSource, type ViewLintIssue } from '@pondoknusa/views';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { parseOptions, positionalArgs } from '../utils.js';
import { bootViewApplication } from '../view-bootstrap.js';

export class ViewLintCommand extends Command {
  override readonly name = 'view:lint';
  override readonly description = 'Lint Tyr templates for common issues';
  override readonly usage = 'pondoknusa view:lint [--strict]';

  async handle(args: string[]): Promise<number> {
    const options = parseOptions(args);
    positionalArgs(args);

    const root = await requireProjectRoot();
    const { engine } = await bootViewApplication(root);

    const issues: Array<ViewLintIssue & { view: string }> = [];
    const strict = options.strict === true;

    const viewNames = await engine.listViewNames();

    for (const name of viewNames) {
      const filePath = await engine.sourcePathFor(name);
      const source = await readFile(filePath, 'utf8');
      const found = await lintViewSource(source, {
        viewPath: filePath,
        componentExists: (component) => engine.exists(component),
        escapeContexts: new Set(engine.getRegistry().getEscapeContexts().keys()),
        customDirectives: engine.getRegistry().getDirectiveNames(),
        strict,
      });

      for (const issue of found) {
        issues.push({ ...issue, view: name });
      }
    }

    if (issues.length === 0) {
      console.log(`No lint issues found in ${viewNames.length} view(s).`);
      return 0;
    }

    const errors = issues.filter((issue) => issue.severity === 'error');
    const warnings = issues.filter((issue) => issue.severity === 'warning');

    for (const issue of errors) {
      printIssue(issue);
    }

    for (const issue of warnings) {
      printIssue(issue);
    }

    const summary = [
      errors.length > 0 ? `${errors.length} error(s)` : null,
      warnings.length > 0 ? `${warnings.length} warning(s)` : null,
    ]
      .filter(Boolean)
      .join(', ');

    console.error(`Found ${summary}.`);
    return lintHasErrors(issues) ? 1 : 0;
  }
}

function printIssue(issue: ViewLintIssue & { view: string }): void {
  const location =
    issue.column !== undefined
      ? `${issue.view}:${issue.line}:${issue.column}`
      : `${issue.view}:${issue.line}`;
  const label = issue.severity === 'error' ? 'error' : 'warning';
  console.error(`[${label}] [${issue.rule}] ${location} ${issue.message}`);
}