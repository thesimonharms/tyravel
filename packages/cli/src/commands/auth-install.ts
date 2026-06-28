import { loadConfig } from '@tyravel/config';
import { Command } from '../command.js';
import { isHeadlessProject } from '../headless-project.js';
import type { NewProjectOptions } from '../new-project-options.js';
import { requireProjectRoot } from '../project.js';
import {
  headlessAuthConfig,
  headlessAuthRoutes,
  headlessMainEntryWithAuth,
} from '../stubs-headless.js';
import {
  appServiceProviderWithAuth,
  authConfig,
  authController,
  authRoutes,
  mainEntryWithAuth,
  oauthAccountsMigration,
  passwordResetTokensMigration,
  personalAccessTokensMigration,
  postPolicyStub,
  sessionsTableMigration,
  userModel,
  usersTableMigration,
} from '../stubs.js';
import { projectPath, writeFile, pathExists } from '../utils.js';

export class AuthInstallCommand extends Command {
  override readonly name = 'auth:install';
  override readonly description =
    'Scaffold auth (session + API tokens, policies, password reset, OAuth)';
  override readonly usage = 'tyravel auth:install';

  async handle(): Promise<number> {
    const root = await requireProjectRoot();
    const headless = await isHeadlessProject(root);

    const configPath = projectPath(root, 'config/auth.ts');
    if (await pathExists(configPath)) {
      console.error('config/auth.ts already exists.');
      return 1;
    }

    await writeFile(configPath, headless ? headlessAuthConfig() : authConfig());
    await writeFile(projectPath(root, 'src/models/User.ts'), userModel());
    await writeFile(projectPath(root, 'src/controllers/AuthController.ts'), authController());
    await writeFile(
      projectPath(root, 'src/routes/auth.ts'),
      headless ? headlessAuthRoutes() : authRoutes(),
    );
    await writeFile(projectPath(root, 'src/policies/PostPolicy.ts'), postPolicyStub());
    await writeFile(projectPath(root, 'src/providers/app-service-provider.ts'), appServiceProviderWithAuth());
    await writeFile(
      projectPath(root, 'database/migrations/20260101000000_create_users_table.ts'),
      usersTableMigration(),
    );
    await writeFile(
      projectPath(root, 'database/migrations/20260101000001_create_sessions_table.ts'),
      sessionsTableMigration(),
    );
    await writeFile(
      projectPath(root, 'database/migrations/20260101000002_create_password_reset_tokens_table.ts'),
      passwordResetTokensMigration(),
    );
    await writeFile(
      projectPath(root, 'database/migrations/20260101000003_create_personal_access_tokens_table.ts'),
      personalAccessTokensMigration(),
    );
    await writeFile(
      projectPath(root, 'database/migrations/20260101000004_create_oauth_accounts_table.ts'),
      oauthAccountsMigration(),
    );
    if (headless) {
      const projectOptions = await resolveHeadlessAuthOptions(root);
      await writeFile(projectPath(root, 'src/main.ts'), headlessMainEntryWithAuth(projectOptions));
    } else {
      await writeFile(projectPath(root, 'src/main.ts'), mainEntryWithAuth());
    }

    console.log('Auth scaffolding installed.');
    console.log('');
    console.log('Next steps:');
    console.log('  tyravel migrate');
    if (headless) {
      console.log('  POST /api/v1/login  |  POST /api/v1/tokens (session)  |  Authorization: Bearer <token> (api guard)');
    } else {
      console.log('  POST /login  |  POST /tokens (session)  |  Authorization: Bearer <token> (api guard)');
    }
    console.log('  POST /forgot-password  |  POST /reset-password');
    console.log('  GET /auth/github/redirect  |  GET /auth/github/callback');
    console.log('');
    console.log('Optional hardening: tyravel crypto:install');

    return 0;
  }
}

async function resolveHeadlessAuthOptions(root: string): Promise<NewProjectOptions> {
  const config = (await loadConfig(root, { validate: false })) as {
    database?: { default?: string };
    redis?: { default?: string };
  };

  const defaultDb = config.database?.default ?? 'sqlite';
  const database =
    defaultDb === 'mysql' || defaultDb === 'postgres' ? defaultDb : 'sqlite';

  return {
    database,
    redis: Boolean(config.redis?.default),
    auth: true,
    queue: 'database',
    mail: 'log',
    ai: false,
    template: 'headless',
    headless: true,
  };
}