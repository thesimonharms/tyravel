import { readFileSync } from 'node:fs';
import { lintViewSource, type ViewLintIssue } from '@tyravel/views';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { parseOptions, positionalArgs } from '../utils.js';
import { bootViewApplication } from '../view-bootstrap.js';

export class ViewLintCommand extends Command {
  override readonly name = 'view:lint';
  override readonly description = 'Lint Tyr templates for common issues';
  override readonly usage = 'tyravel view:lint';

  async handle(args: string[]): Promise<number> {
    parseOptions(args);
    positionalArgs(args);

    const root = requireProjectRoot();
    const { engine } = await bootViewApplication(root);

    const issues: Array<ViewLintIssue & { view: string }> = [];

    for (const name of engine.listViewNames()) {
      const filePath = engine.sourcePathFor(name);
      const source = readFileSync(filePath, 'utf8');
      const found = lintViewSource(source, {
        viewPath: filePath,
        componentExists: (component) => engine.exists(component),
        escapeContexts: new Set(engine.getRegistry().getEscapeContexts().keys()),
        customDirectives: engine.getRegistry().getDirectiveNames(),
      });

      for (const issue of found) {
        issues.push({ ...issue, view: name });
      }
    }

    if (issues.length === 0) {
      console.log(`No lint issues found in ${engine.listViewNames().length} view(s).`);
      return 0;
    }

    for (const issue of issues) {
      const location =
        issue.column !== undefined
          ? `${issue.view}:${issue.line}:${issue.column}`
          : `${issue.view}:${issue.line}`;
      console.error(`[${issue.rule}] ${location} ${issue.message}`);
    }

    console.error(`Found ${issues.length} issue(s).`);
    return 1;
  }
}