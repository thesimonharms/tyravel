import { chmod } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { Command } from '../command.js';
import { resolveNewProjectOptions } from '../new-project-options.js';
import {
  broadcastChannels,
  broadcastingConfig,
  cacheConfig,
  echoBootstrap,
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
  defaultLocaleFile,
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
} from '../stubs.js';
import { webRoutesForTemplate } from '../stubs-templates.js';
import {
  deployCloudflareMd,
  deployReadme,
  dockerCompose,
  dockerEntrypoint,
  dockerfile,
  dockerignore,
  flyToml,
  railwayToml,
} from '../stubs-deploy.js';
import { envExample } from '../stubs-project.js';
import { featureTestStub, projectVitestConfig, viewTypesWorkflow } from '../stubs-testing.js';
import {
  aiAppServiceProvider,
  aiMainEntry,
  conversationMessageModel,
  conversationMessagesMigration,
  documentModel,
  documentsMigration,
  embedStub,
  graphqlRoutes,
  groundedPromptTemplate,
  ragRoutes,
  vectorConfig,
} from '../stubs-ai.js';
import { printFirstRunChecklist } from '../first-run-checklist.js';
import {
  headlessApiRoutes,
  headlessAppConfig,
  headlessFeatureTestStub,
  headlessHttpConfig,
  headlessMainEntry,
  headlessPackageJson,
  headlessProjectConfig,
  headlessReadme,
} from '../stubs-headless.js';
import { optionString, parseOptions, positionalArgs, projectPath, toKebabCase, writeFile, pathExists } from '../utils.js';

export class NewCommand extends Command {
  override readonly name = 'new';
  override readonly description = 'Create a new Tyravel application';
  override readonly usage =
    'tyravel new <name> [--path=<directory>] [--headless] [--template=default|api|ssr|saas|headless] [--db=sqlite|mysql|postgres] [--redis|--no-redis] [--auth|--no-auth] [--queue=database|redis] [--mail=log|smtp|array] [--ai|--no-ai]';

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

    const headless = projectOptions.headless;

    await writeFile(
      projectPath(targetDir, 'package.json'),
      headless ? headlessPackageJson(name, projectOptions) : projectPackageJson(name, projectOptions),
    );
    const envContents = envExample(name, projectOptions);
    await writeFile(projectPath(targetDir, '.env.example'), envContents);
    await writeFile(projectPath(targetDir, '.env'), envContents);
    await writeFile(
      projectPath(targetDir, 'tyravel.json'),
      headless ? headlessProjectConfig(name) : projectConfig(name),
    );
    await writeFile(
      projectPath(targetDir, 'config/app.ts'),
      headless ? headlessAppConfig(name) : appConfig(name),
    );
    await writeFile(projectPath(targetDir, 'config/database.ts'), databaseConfig(projectOptions));
    if (!headless) {
      await writeFile(projectPath(targetDir, 'config/views.ts'), viewsConfig());
      await writeFile(projectPath(targetDir, 'lang/en.json'), `${defaultLocaleFile()}\n`);
    }
    await writeFile(projectPath(targetDir, 'config/queue.ts'), queueConfig(projectOptions));
    await writeFile(projectPath(targetDir, 'config/events.ts'), eventsConfig());
    await writeFile(
      projectPath(targetDir, 'config/broadcasting.ts'),
      broadcastingConfig(projectOptions),
    );
    await writeFile(projectPath(targetDir, 'config/cache.ts'), cacheConfig(projectOptions));
    await writeFile(projectPath(targetDir, 'config/filesystems.ts'), filesystemsConfig());
    await writeFile(projectPath(targetDir, 'config/cors.ts'), corsConfig());
    await writeFile(
      projectPath(targetDir, 'config/http.ts'),
      headless ? headlessHttpConfig() : httpConfig(),
    );
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
    if (!headless) {
      await writeFile(
        projectPath(targetDir, 'resources/views/layouts/app.tyr'),
        layoutView(),
      );
    }
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
    await writeFile(
      projectPath(targetDir, 'src/main.ts'),
      headless
        ? headlessMainEntry(projectOptions)
        : projectOptions.ai
          ? aiMainEntry(projectOptions)
          : mainEntry(projectOptions),
    );
    await writeFile(
      projectPath(targetDir, 'src/providers/app-service-provider.ts'),
      projectOptions.ai ? aiAppServiceProvider() : appServiceProvider(),
    );
    if (headless) {
      await writeFile(projectPath(targetDir, 'src/routes/api.ts'), headlessApiRoutes());
      await writeFile(projectPath(targetDir, 'README.md'), headlessReadme(name));
    } else {
      await writeFile(
        projectPath(targetDir, 'src/routes/web.ts'),
        webRoutesForTemplate(projectOptions.template),
      );
    }
    if (projectOptions.template === 'ssr' || projectOptions.template === 'saas') {
      await writeFile(
        projectPath(targetDir, 'resources/views/welcome.tyr'),
        `@extends('layouts.app')

@section('content')
  <h1>{{ $title }}</h1>
  @if(isset($subtitle))
    <p>{{ $subtitle }}</p>
  @endif
@endsection
`,
      );
    }
    if (projectOptions.ai) {
      const ts = Date.now();
      await writeFile(projectPath(targetDir, 'config/vector.ts'), vectorConfig());
      await writeFile(projectPath(targetDir, 'src/embed.ts'), embedStub());
      await writeFile(projectPath(targetDir, 'src/models/Document.ts'), documentModel());
      await writeFile(
        projectPath(targetDir, 'src/models/ConversationMessage.ts'),
        conversationMessageModel(),
      );
      await writeFile(projectPath(targetDir, 'src/routes/rag.ts'), ragRoutes());
      await writeFile(projectPath(targetDir, 'src/routes/graphql.ts'), graphqlRoutes());
      await writeFile(
        projectPath(targetDir, 'resources/prompts/grounded-qna.txt'),
        groundedPromptTemplate(),
      );
      await writeFile(
        projectPath(targetDir, `database/migrations/${ts}_create_documents_table.ts`),
        documentsMigration(String(ts)),
      );
      await writeFile(
        projectPath(targetDir, `database/migrations/${ts + 1}_create_conversation_messages_table.ts`),
        conversationMessagesMigration(String(ts + 1)),
      );
    }
    if (!headless) {
      await writeFile(
        projectPath(targetDir, 'src/routes/channels.ts'),
        broadcastChannels(),
      );
      await writeFile(
        projectPath(targetDir, 'resources/client/echo.ts'),
        echoBootstrap(projectOptions),
      );
    }
    await writeFile(projectPath(targetDir, 'vitest.config.ts'), projectVitestConfig());
    await writeFile(
      projectPath(targetDir, 'tests/feature/example.test.ts'),
      headless ? headlessFeatureTestStub('ExampleTest') : featureTestStub('ExampleTest'),
    );
    const entrypointPath = projectPath(targetDir, 'deploy/docker-entrypoint.sh');
    await writeFile(entrypointPath, dockerEntrypoint());
    await chmod(entrypointPath, 0o755);
    await writeFile(projectPath(targetDir, 'deploy/Dockerfile'), dockerfile());
    await writeFile(projectPath(targetDir, 'deploy/docker-compose.yml'), dockerCompose());
    await writeFile(projectPath(targetDir, 'deploy/fly.toml'), flyToml(name));
    await writeFile(projectPath(targetDir, 'deploy/railway.toml'), railwayToml());
    await writeFile(projectPath(targetDir, 'deploy/README.md'), deployReadme());
    await writeFile(projectPath(targetDir, 'deploy/cloudflare.md'), deployCloudflareMd());
    await writeFile(projectPath(targetDir, '.dockerignore'), dockerignore());
    if (!headless) {
      await writeFile(
        projectPath(targetDir, '.github/workflows/view-types.yml'),
        viewTypesWorkflow(),
      );
    }

    console.log(`Tyravel application created successfully.`);
    console.log('');
    console.log(`  Template: ${projectOptions.template}`);
    if (headless) {
      console.log(`  Headless: yes (backend-only API)`);
    }
    console.log(`  Database: ${projectOptions.database}`);
    console.log(`  Auth: ${projectOptions.auth ? 'yes' : 'no'}`);
    console.log(`  Queue: ${projectOptions.queue}`);
    console.log(`  Mail: ${projectOptions.mail}`);
    console.log(`  Redis: ${projectOptions.redis ? 'yes' : 'no'}`);
    console.log(`  AI/RAG: ${projectOptions.ai ? 'yes' : 'no'}`);
    console.log('');
    // Run npm install with inline spinner (only in interactive mode)
    let npmInstalled = false;
    if (process.stdout.isTTY) {
      console.log('');
      console.log('Running npm install...');
      const installCode = await runNpmInstall(targetDir);
      npmInstalled = installCode === 0;
      if (installCode === 0) {
        console.log('✓ npm install complete');
      } else {
        console.log('⚠ npm install finished with warnings (run `npm install` manually)');
      }
    }

    printFirstRunChecklist(name, projectOptions, npmInstalled);

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