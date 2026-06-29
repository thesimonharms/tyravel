import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { Command } from '../command.js';
import { evaluatePerfBudgets } from '../perf-budget.js';
import { loadBenchmarkRunner } from '../perf-runner.js';
import { loadProjectConfig, requireProjectRoot } from '../project.js';
import { parseOptions, positionalArgs } from '../utils.js';

export class TestCommand extends Command {
  override readonly name = 'test';
  override readonly description = 'Run the project test suite via Vitest';
  override readonly usage = 'pondoknusa test [--perf] [-- <vitest args>]';

  async handle(args: string[]): Promise<number> {
    const options = parseOptions(args);
    const positional = positionalArgs(args);

    const root = await requireProjectRoot();
    const config = await loadProjectConfig(root);

    if (options.perf === true) {
      return this.runPerfBudget(root, config);
    }
    const vitestBin = join(
      root,
      'node_modules',
      '.bin',
      process.platform === 'win32' ? 'vitest.cmd' : 'vitest',
    );

    const vitestArgs = positional.length > 0 ? positional : ['run'];

    const code = await new Promise<number>((resolvePromise) => {
      const proc = spawn(vitestBin, vitestArgs, {
        cwd: root,
        stdio: 'inherit',
        env: {
          ...process.env,
          APP_ENV: 'testing',
          NODE_ENV: 'test',
        },
        shell: process.platform === 'win32',
      });

      proc.on('close', (exitCode) => resolvePromise(exitCode ?? 1));
      proc.on('error', () => resolvePromise(1));
    });

    return code;
  }

  private async runPerfBudget(
    root: string,
    config: Awaited<ReturnType<typeof loadProjectConfig>>,
  ): Promise<number> {
    if (!config.perf?.budgets || Object.keys(config.perf.budgets).length === 0) {
      console.error(
        'No perf budgets configured. Add a "perf.budgets" section to pondoknusa.json.',
      );
      return 1;
    }

    let runBenchmarks: Awaited<ReturnType<typeof loadBenchmarkRunner>>['runBenchmarks'];
    try {
      ({ runBenchmarks } = await loadBenchmarkRunner(root));
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      return 1;
    }

    process.env.BENCHMARK_QUICK = '1';
    const report = await runBenchmarks({
      boot: { iterations: 2 },
      http: { warmup: 5, requests: 20, concurrency: 5 },
      middleware: { warmup: 5, requests: 20, concurrency: 5 },
      orm: { warmup: 2, iterations: 10 },
      views: { warmup: 2, iterations: 10 },
    });

    const violations = evaluatePerfBudgets(report, config);
    if (violations.length === 0) {
      console.log('Perf budgets passed.');
      return 0;
    }

    console.error('Perf budget violations:');
    for (const violation of violations) {
      console.error(
        `- ${violation.label} (${violation.name}): ${violation.value} ${violation.unit} — expected ${violation.expected}`,
      );
    }

    return 1;
  }
}