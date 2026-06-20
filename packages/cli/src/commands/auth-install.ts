import { existsSync } from 'node:fs';
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
import { projectPath, writeFile } from '../utils.js';

export class AuthInstallCommand extends Command {
  override readonly name = 'auth:install';
  override readonly description =
    'Scaffold auth (session + API tokens, policies, password reset, OAuth)';
  override readonly usage = 'tyravel auth:install';

  async handle(): Promise<number> {
    const root = requireProjectRoot();

    const configPath = projectPath(root, 'config/auth.ts');
    if (existsSync(configPath)) {
      console.error('config/auth.ts already exists.');
      return 1;
    }

    writeFile(configPath, authConfig());
    writeFile(projectPath(root, 'src/models/User.ts'), userModel());
    writeFile(projectPath(root, 'src/controllers/AuthController.ts'), authController());
    writeFile(projectPath(root, 'src/routes/auth.ts'), authRoutes());
    writeFile(projectPath(root, 'src/policies/PostPolicy.ts'), postPolicyStub());
    writeFile(projectPath(root, 'src/providers/app-service-provider.ts'), appServiceProviderWithAuth());
    writeFile(
      projectPath(root, 'database/migrations/20260101000000_create_users_table.ts'),
      usersTableMigration(),
    );
    writeFile(
      projectPath(root, 'database/migrations/20260101000001_create_sessions_table.ts'),
      sessionsTableMigration(),
    );
    writeFile(
      projectPath(root, 'database/migrations/20260101000002_create_password_reset_tokens_table.ts'),
      passwordResetTokensMigration(),
    );
    writeFile(
      projectPath(root, 'database/migrations/20260101000003_create_personal_access_tokens_table.ts'),
      personalAccessTokensMigration(),
    );
    writeFile(
      projectPath(root, 'database/migrations/20260101000004_create_oauth_accounts_table.ts'),
      oauthAccountsMigration(),
    );
    writeFile(projectPath(root, 'src/main.ts'), mainEntryWithAuth());

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