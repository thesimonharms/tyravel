import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Command } from '../command.js';
import {
  cacheConfig,
  mailConfig,
  notificationsConfig,
  notificationsTableMigration,
} from '../stubs-ecosystem.js';
import {
  appConfig,
  databaseConfig,
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
import { featureTestStub, projectVitestConfig } from '../stubs-testing.js';
import {
  optionString,
  parseOptions,
  positionalArgs,
  projectPath,
  toKebabCase,
  writeFile,
} from '../utils.js';

export class NewCommand extends Command {
  override readonly name = 'new';
  override readonly description = 'Create a new Tyravel application';
  override readonly usage = 'tyravel new <name> [--path=<directory>]';

  async handle(args: string[]): Promise<number> {
    const options = parseOptions(args);
    const [rawName] = positionalArgs(args);

    if (!rawName) {
      console.error('Project name is required.');
      console.error('Usage: tyravel new <name> [--path=<directory>]');
      return 1;
    }

    const name = toKebabCase(rawName);
    const parentDir = optionString(options, 'path', process.cwd()) ?? process.cwd();
    const targetDir = resolve(parentDir, name);

    if (existsSync(targetDir)) {
      console.error(`Directory already exists: ${targetDir}`);
      return 1;
    }

    writeFile(projectPath(targetDir, 'package.json'), projectPackageJson(name));
    writeFile(projectPath(targetDir, 'tyravel.json'), projectConfig(name));
    writeFile(projectPath(targetDir, 'config/app.ts'), appConfig(name));
    writeFile(projectPath(targetDir, 'config/database.ts'), databaseConfig());
    writeFile(projectPath(targetDir, 'config/views.ts'), viewsConfig());
    writeFile(projectPath(targetDir, 'config/queue.ts'), queueConfig());
    writeFile(projectPath(targetDir, 'config/events.ts'), eventsConfig());
    writeFile(projectPath(targetDir, 'config/cache.ts'), cacheConfig());
    writeFile(projectPath(targetDir, 'config/mail.ts'), mailConfig());
    writeFile(projectPath(targetDir, 'config/notifications.ts'), notificationsConfig());
    writeFile(
      projectPath(targetDir, 'resources/views/layouts/app.tyr'),
      layoutView(),
    );
    writeFile(projectPath(targetDir, 'database/migrations/.gitkeep'), '');
    const ts = Date.now();
    writeFile(
      projectPath(targetDir, `database/migrations/${ts}_create_jobs_table.ts`),
      jobsTableMigration(),
    );
    writeFile(
      projectPath(targetDir, `database/migrations/${ts + 1}_create_failed_jobs_table.ts`),
      failedJobsTableMigration(),
    );
    writeFile(
      projectPath(targetDir, `database/migrations/${ts + 2}_create_notifications_table.ts`),
      notificationsTableMigration(),
    );
    writeFile(projectPath(targetDir, 'src/main.ts'), mainEntry());
    writeFile(
      projectPath(targetDir, 'src/providers/app-service-provider.ts'),
      appServiceProvider(),
    );
    writeFile(projectPath(targetDir, 'src/routes/web.ts'), webRoutes());
    writeFile(projectPath(targetDir, 'vitest.config.ts'), projectVitestConfig());
    writeFile(
      projectPath(targetDir, 'tests/feature/example.test.ts'),
      featureTestStub('ExampleTest'),
    );

    console.log(`Tyravel application created successfully.`);
    console.log('');
    console.log(`  cd ${name}`);
    console.log('  npm install');
    console.log('  npm test');
    console.log('  tyravel serve');

    return 0;
  }
}