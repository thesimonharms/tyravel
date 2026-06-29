import { readFile, writeFile as fsWriteFile } from 'node:fs/promises';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import {
  oauthServerConfig,
  oauthServerController,
  oauthServerMigration,
  oauthServerRoutes,
} from '../stubs.js';
import { projectPath, writeFile, pathExists } from '../utils.js';

export class OAuthInstallCommand extends Command {
  override readonly name = 'oauth:install';
  override readonly description = 'Scaffold OAuth2 authorization server routes and migrations';
  override readonly usage = 'pondoknusa oauth:install';

  async handle(): Promise<number> {
    const root = await requireProjectRoot();

    const configPath = projectPath(root, 'config/oauthServer.ts');
    if (await pathExists(configPath)) {
      console.error('config/oauthServer.ts already exists.');
      return 1;
    }

    await writeFile(configPath, oauthServerConfig());
    await writeFile(
      projectPath(root, 'src/controllers/OAuthServerController.ts'),
      oauthServerController(),
    );
    await writeFile(projectPath(root, 'src/routes/oauth-server.ts'), oauthServerRoutes());
    await writeFile(
      projectPath(root, 'database/migrations/20260102000000_create_oauth_server_tables.ts'),
      oauthServerMigration(),
    );

    await this.patchMainEntry(root);
    await this.patchAppServiceProvider(root);

    console.log('OAuth2 authorization server scaffolding installed.');
    console.log('');
    console.log('Next steps:');
    console.log('  npm install @pondoknusa/auth-oauth');
    console.log('  pondoknusa migrate');
    console.log('  pondoknusa oauth:client:create "My App" --redirect=http://127.0.0.1:3000/callback');
    console.log('');
    console.log('Optional hardening:');
    console.log('  pondoknusa crypto:install');
    console.log('  pondoknusa crypto:generate-keys --algorithm=ml-dsa-65');
    console.log('  Set OAUTH_SIGN_TOKENS=true and token key env vars in .env');
    console.log('');
    console.log('Endpoints:');
    console.log('  GET  /oauth/authorize');
    console.log('  POST /oauth/authorize');
    console.log('  POST /oauth/token');
    console.log('  POST /oauth/revoke');
    console.log('  GET  /oauth/userinfo');

    return 0;
  }

  private async patchMainEntry(root: string): Promise<void> {
    const mainPath = projectPath(root, 'src/main.ts');
    let main = await readFile(mainPath, 'utf8');

    if (!main.includes('@pondoknusa/auth-oauth')) {
      main = `import { OAuthServerServiceProvider } from '@pondoknusa/auth-oauth';\n${main}`;
    }

    if (!main.includes('OAuthServerServiceProvider')) {
      main = main.replace(
        'app.register(AuthServiceProvider);',
        'app.register(AuthServiceProvider);\napp.register(OAuthServerServiceProvider);',
      );
    }

    if (!main.includes('routes/oauth-server')) {
      const routeImport = "import './routes/oauth-server.js';";
      if (main.includes("import './routes/auth.js';")) {
        main = main.replace(
          "import './routes/auth.js';",
          `import './routes/auth.js';\n${routeImport}`,
        );
      } else if (main.includes("import './routes/web.js';")) {
        main = main.replace(
          "import './routes/web.js';",
          `import './routes/web.js';\n${routeImport}`,
        );
      } else if (!main.includes(routeImport)) {
        main = `${main.trimEnd()}\n${routeImport}\n`;
      }
    }

    await fsWriteFile(mainPath, main);
  }

  private async patchAppServiceProvider(root: string): Promise<void> {
    const providerPath = projectPath(root, 'src/providers/app-service-provider.ts');
    let provider = await readFile(providerPath, 'utf8');

    if (!provider.includes('OAuthServerController')) {
      provider = provider.replace(
        "import { ServiceProvider } from '@pondoknusa/core';",
        "import { ServiceProvider } from '@pondoknusa/core';\nimport { OAuthServerController } from '../controllers/OAuthServerController.js';",
      );
      provider = provider.replace(
        'this.app.bind(AuthController',
        'this.app.bind(OAuthServerController, () => new OAuthServerController(this.app));\n    this.app.bind(AuthController',
      );
    }

    await fsWriteFile(providerPath, provider);
  }
}