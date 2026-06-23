import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { Command } from '../command.js';
import { resolveNewProjectOptions } from '../new-project-options.js';
import {
  broadcastingConfig,
  cacheConfig,
  corsConfig,
  filesystemsConfig,
  healthConfig,
  httpConfig,
  logConfig,
  redisConfig,
  mailConfig,
  notificationsConfig,
  notificationsTableMigration,
} from '../stubs-ecosystem.js';
import {
  appConfig,
  databaseConfig,
  databaseSeeder,
  appServiceProvider,
  eventsConfig,
  layoutView,
  mainEntry,
  projectConfig,
  projectPackageJson,
  queueConfig,
  jobsTableMigration,
  failedJobsTableMigration,
  viewsConfig,
  webRoutes,
} from '../stubs.js';
import { envExample } from '../stubs-project.js';
import { featureTestStub, projectVitestConfig } from '../stubs-testing.js';
import { optionString, parseOptions, positionalArgs, projectPath, toKebabCase, writeFile, pathExists } from '../utils.js';

export class NewCommand extends Command {
  override readonly name = 'new';
  override readonly description = 'Create a new Tyravel application';
  override readonly usage =
    'tyravel new <name> [--path=<directory>] [--db=sqlite|mysql|postgres] [--redis|--no-redis] [--auth|--no-auth] [--queue=database|redis] [--mail=log|smtp|array]';

  async handle(args: string[]): Promise<number> {
    const options = parseOptions(args);
    const [rawName] = positionalArgs(args);

    if (!rawName) {
      console.error('Project name is required.');
      console.error(this.usage);
      return 1;
    }

    let projectOptions;
    try {
      projectOptions = await resolveNewProjectOptions(options);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      return 1;
    }

    const name = toKebabCase(rawName);
    const parentDir = optionString(options, 'path', process.cwd()) ?? process.cwd();
    const targetDir = resolve(parentDir, name);

    if (await pathExists(targetDir)) {
      console.error(`Directory already exists: ${targetDir}`);
      return 1;
    }

    await writeFile(projectPath(targetDir, 'package.json'), projectPackageJson(name, projectOptions));
    const envContents = envExample(name, projectOptions);
    await writeFile(projectPath(targetDir, '.env.example'), envContents);
    await writeFile(projectPath(targetDir, '.env'), envContents);
    await writeFile(projectPath(targetDir, 'tyravel.json'), projectConfig(name));
    await writeFile(projectPath(targetDir, 'config/app.ts'), appConfig(name));
    await writeFile(projectPath(targetDir, 'config/database.ts'), databaseConfig(projectOptions));
    await writeFile(projectPath(targetDir, 'config/views.ts'), viewsConfig());
    await writeFile(projectPath(targetDir, 'config/queue.ts'), queueConfig(projectOptions));
    await writeFile(projectPath(targetDir, 'config/events.ts'), eventsConfig());
    await writeFile(projectPath(targetDir, 'config/broadcasting.ts'), broadcastingConfig());
    await writeFile(projectPath(targetDir, 'config/cache.ts'), cacheConfig(projectOptions));
    await writeFile(projectPath(targetDir, 'config/filesystems.ts'), filesystemsConfig());
    await writeFile(projectPath(targetDir, 'config/cors.ts'), corsConfig());
    await writeFile(projectPath(targetDir, 'config/http.ts'), httpConfig());
    await writeFile(projectPath(targetDir, 'config/log.ts'), logConfig());
    await writeFile(projectPath(targetDir, 'config/health.ts'), healthConfig());
    if (projectOptions.redis) {
      await writeFile(projectPath(targetDir, 'config/redis.ts'), redisConfig());
    }
    await writeFile(projectPath(targetDir, 'config/mail.ts'), mailConfig());
    await writeFile(
      projectPath(targetDir, 'config/notifications.ts'),
      notificationsConfig(projectOptions.database),
    );
    await writeFile(
      projectPath(targetDir, 'resources/views/layouts/app.tyr'),
      layoutView(),
    );
    await writeFile(projectPath(targetDir, 'database/migrations/.gitkeep'), '');
    await writeFile(projectPath(targetDir, 'database/factories/.gitkeep'), '');
    await writeFile(
      projectPath(targetDir, 'database/seeders/database-seeder.ts'),
      databaseSeeder(),
    );
    const ts = Date.now();
    await writeFile(
      projectPath(targetDir, `database/migrations/${ts}_create_jobs_table.ts`),
      jobsTableMigration(),
    );
    await writeFile(
      projectPath(targetDir, `database/migrations/${ts + 1}_create_failed_jobs_table.ts`),
      failedJobsTableMigration(),
    );
    await writeFile(
      projectPath(targetDir, `database/migrations/${ts + 2}_create_notifications_table.ts`),
      notificationsTableMigration(),
    );
    await writeFile(projectPath(targetDir, 'src/main.ts'), mainEntry(projectOptions));
    await writeFile(
      projectPath(targetDir, 'src/providers/app-service-provider.ts'),
      appServiceProvider(),
    );
    await writeFile(projectPath(targetDir, 'src/routes/web.ts'), webRoutes());
    await writeFile(projectPath(targetDir, 'vitest.config.ts'), projectVitestConfig());
    await writeFile(
      projectPath(targetDir, 'tests/feature/example.test.ts'),
      featureTestStub('ExampleTest'),
    );

    console.log(`Tyravel application created successfully.`);
    console.log('');
    console.log(`  Database: ${projectOptions.database}`);
    console.log(`  Auth: ${projectOptions.auth ? 'yes' : 'no'}`);
    console.log(`  Queue: ${projectOptions.queue}`);
    console.log(`  Mail: ${projectOptions.mail}`);
    console.log(`  Redis: ${projectOptions.redis ? 'yes' : 'no'}`);
    console.log('');
    console.log(`  cd ${name}`);
    console.log('  npm install');
    console.log('  npm test');
    console.log('  tyravel serve');

    // Run npm install with inline spinner (only in interactive mode)
    if (process.stdout.isTTY) {
      console.log('');
      console.log('Running npm install...');
      const installCode = await runNpmInstall(targetDir);
      if (installCode === 0) {
        console.log('✓ npm install complete');
      } else {
        console.log('⚠ npm install finished with warnings (run `npm install` manually)');
      }
    } else {
      console.log('');
      console.log('  Run: npm install');
    }

    return 0;
  }
}

/**
 * Run `npm install` in the given directory with a simple progress indicator.
 */
async function runNpmInstall(targetDir: string): Promise<number> {
  return new Promise((resolvePromise) => {
    const proc = spawn('npm', ['install'], {
      cwd: targetDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let dots = 0;
    const spinner = setInterval(() => {
      dots = (dots + 1) % 4;
      const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
      process.stdout.write(`\r${frames[dots]} Installing dependencies...`);
    }, 150);

    let output = '';
    proc.stdout?.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });

    proc.stderr?.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });

    proc.on('close', (code) => {
      clearInterval(spinner);
      process.stdout.write('\r' + ' '.repeat(40) + '\r');
      resolvePromise(code ?? 1);
    });

    proc.on('error', () => {
      clearInterval(spinner);
      process.stdout.write('\r' + ' '.repeat(40) + '\r');
      resolvePromise(1);
    });
  });
}