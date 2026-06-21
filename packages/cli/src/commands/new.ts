import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Command } from '../command.js';
import { resolveNewProjectOptions } from '../new-project-options.js';
import {
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
  override readonly usage =
    'tyravel new <name> [--path=<directory>] [--db=sqlite|mysql|postgres] [--redis] [--no-redis]';

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

    if (existsSync(targetDir)) {
      console.error(`Directory already exists: ${targetDir}`);
      return 1;
    }

    writeFile(projectPath(targetDir, 'package.json'), projectPackageJson(name, projectOptions));
    const envContents = envExample(name, projectOptions);
    writeFile(projectPath(targetDir, '.env.example'), envContents);
    writeFile(projectPath(targetDir, '.env'), envContents);
    writeFile(projectPath(targetDir, 'tyravel.json'), projectConfig(name));
    writeFile(projectPath(targetDir, 'config/app.ts'), appConfig(name));
    writeFile(projectPath(targetDir, 'config/database.ts'), databaseConfig(projectOptions));
    writeFile(projectPath(targetDir, 'config/views.ts'), viewsConfig());
    writeFile(projectPath(targetDir, 'config/queue.ts'), queueConfig(projectOptions));
    writeFile(projectPath(targetDir, 'config/events.ts'), eventsConfig());
    writeFile(projectPath(targetDir, 'config/cache.ts'), cacheConfig(projectOptions));
    writeFile(projectPath(targetDir, 'config/filesystems.ts'), filesystemsConfig());
    writeFile(projectPath(targetDir, 'config/cors.ts'), corsConfig());
    writeFile(projectPath(targetDir, 'config/http.ts'), httpConfig());
    writeFile(projectPath(targetDir, 'config/log.ts'), logConfig());
    writeFile(projectPath(targetDir, 'config/health.ts'), healthConfig());
    if (projectOptions.redis) {
      writeFile(projectPath(targetDir, 'config/redis.ts'), redisConfig());
    }
    writeFile(projectPath(targetDir, 'config/mail.ts'), mailConfig());
    writeFile(
      projectPath(targetDir, 'config/notifications.ts'),
      notificationsConfig(projectOptions.database),
    );
    writeFile(
      projectPath(targetDir, 'resources/views/layouts/app.tyr'),
      layoutView(),
    );
    writeFile(projectPath(targetDir, 'database/migrations/.gitkeep'), '');
    writeFile(projectPath(targetDir, 'database/factories/.gitkeep'), '');
    writeFile(
      projectPath(targetDir, 'database/seeders/database-seeder.ts'),
      databaseSeeder(),
    );
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
    writeFile(projectPath(targetDir, 'src/main.ts'), mainEntry(projectOptions));
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
    console.log(`  Database: ${projectOptions.database}`);
    console.log(`  Redis: ${projectOptions.redis ? 'yes' : 'no'}`);
    console.log('');
    console.log(`  cd ${name}`);
    console.log('  npm install');
    console.log('  npm test');
    console.log('  tyravel serve');

    return 0;
  }
}