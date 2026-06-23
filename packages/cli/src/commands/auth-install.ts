import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
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

    const configPath = projectPath(root, 'config/auth.ts');
    if (await pathExists(configPath)) {
      console.error('config/auth.ts already exists.');
      return 1;
    }

    await writeFile(configPath, authConfig());
    await writeFile(projectPath(root, 'src/models/User.ts'), userModel());
    await writeFile(projectPath(root, 'src/controllers/AuthController.ts'), authController());
    await writeFile(projectPath(root, 'src/routes/auth.ts'), authRoutes());
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
    await writeFile(projectPath(root, 'src/main.ts'), mainEntryWithAuth());

    console.log('Auth scaffolding installed.');
    console.log('');
    console.log('Next steps:');
    console.log('  tyravel migrate');
    console.log('  POST /login  |  POST /tokens (session)  |  Authorization: Bearer <token> (api guard)');
    console.log('  POST /forgot-password  |  POST /reset-password');
    console.log('  GET /auth/github/redirect  |  GET /auth/github/callback');

    return 0;
  }
}