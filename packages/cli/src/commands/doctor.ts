import { Command } from '../command.js';
import { runDoctorChecks } from '../doctor-checks.js';
import { runPerfSmoke } from '../perf-smoke.js';
import { requireProjectRoot } from '../project.js';
import { parseOptions, positionalArgs } from '../utils.js';

export class DoctorCommand extends Command {
  override readonly name = 'doctor';
  override readonly description = 'Run environment and project health checks';
  override readonly usage = 'pondoknusa doctor [--perf]';

  async handle(args: string[]): Promise<number> {
    const options = parseOptions(args);
    positionalArgs(args);

    const root = await requireProjectRoot();
    const checks = await runDoctorChecks(root);

    if (options.perf) {
      const perf = await runPerfSmoke();
      checks.push({
        name: 'perf:http',
        ok: perf.ok,
        message: perf.message,
      });
    }

    console.log('Pondoknusa doctor');
    console.log('');

    let failed = 0;
    for (const check of checks) {
      const icon = check.ok ? '✓' : '✗';
      console.log(`${icon} ${check.name}: ${check.message}`);
      if (!check.ok) {
        failed += 1;
      }
    }

    console.log('');
    if (failed > 0) {
      console.log(`${failed} check(s) failed.`);
      return 1;
    }

    console.log('All checks passed.');
    return 0;
  }
}