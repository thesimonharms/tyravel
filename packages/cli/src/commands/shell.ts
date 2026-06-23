import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';

export class ShellCommand extends Command {
  override readonly name = 'shell';
  override readonly description = 'Start an interactive Tyravel shell (REPL)';

  async handle(): Promise<number> {
    const projectRoot = await requireProjectRoot();

    try {
      const { startRepl } = await import('@tyravel/repl');
      return startRepl(projectRoot);
    } catch (err) {
      console.error('Failed to start shell:', (err as Error).message);
      return 1;
    }
  }
}
