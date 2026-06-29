import type { NewProjectOptions } from './new-project-options.js';

export function printFirstRunChecklist(
  name: string,
  options: NewProjectOptions,
  npmInstalled: boolean,
): void {
  console.log('');
  console.log('First-run checklist:');
  console.log('');
  console.log(`  cd ${name}`);

  if (!npmInstalled) {
    console.log('  npm install');
  }

  console.log('  pondoknusa migrate');
  console.log('  pondoknusa dev');

  if (options.headless) {
    console.log('  curl http://127.0.0.1:3000/api/v1/health');
  }

  console.log('  pondoknusa dev --queue     # web + queue worker together');
  console.log('  # or: npm run dev:worker in another terminal');

  console.log('  pondoknusa test');

  if (options.auth) {
    console.log(
      options.headless
        ? '  pondoknusa auth:install    # API token guards and migrations'
        : '  pondoknusa auth:install    # guards, login routes, migrations',
    );
  }

  console.log(
    options.headless
      ? '  pondoknusa deploy:check    # doctor + routes (no view cache)'
      : '  pondoknusa doctor          # verify environment before deploy',
  );
  console.log('');
}