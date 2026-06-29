import { readFile, writeFile as fsWriteFile } from 'node:fs/promises';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import {
  adminConfig,
  adminLazyRegistration,
  adminPanelServiceProvider,
  adminResources,
  adminRoutes,
  userPolicyWithAdmin,
} from '../stubs.js';
import { projectPath, writeFile, pathExists } from '../utils.js';

export class AdminInstallCommand extends Command {
  override readonly name = 'admin:install';
  override readonly description = 'Scaffold optional admin panel routes, config, and policies';
  override readonly usage = 'pondoknusa admin:install';

  async handle(): Promise<number> {
    const root = await requireProjectRoot();

    const authConfigPath = projectPath(root, 'config/auth.ts');
    if (!(await pathExists(authConfigPath))) {
      console.error('config/auth.ts not found. Run pondoknusa auth:install first.');
      return 1;
    }

    const configPath = projectPath(root, 'config/admin.ts');
    if (await pathExists(configPath)) {
      console.error('config/admin.ts already exists.');
      return 1;
    }

    await writeFile(configPath, adminConfig());
    await writeFile(projectPath(root, 'src/routes/admin.ts'), adminRoutes());
    await writeFile(projectPath(root, 'src/admin/resources.ts'), adminResources());
    await writeFile(
      projectPath(root, 'src/providers/admin-service-provider.ts'),
      adminPanelServiceProvider(),
    );
    await writeFile(projectPath(root, 'src/policies/UserPolicy.ts'), userPolicyWithAdmin());

    await this.patchAuthConfig(root);
    await this.patchMainEntry(root);
    await this.patchAppServiceProvider(root);

    console.log('Admin panel scaffolding installed.');
    console.log('');
    console.log('Next steps:');
    console.log('  npm install @pondoknusa/admin');
    console.log('  Register resources in src/admin/resources.ts');
    console.log('  Visit /admin after signing in');

    return 0;
  }

  private async patchAuthConfig(root: string): Promise<void> {
    const authPath = projectPath(root, 'config/auth.ts');
    let auth = await readFile(authPath, 'utf8');

    if (!auth.includes('UserPolicy')) {
      auth = auth.replace(
        "import type { AuthConfig } from '@pondoknusa/auth';",
        "import type { AuthConfig } from '@pondoknusa/auth';\nimport { UserPolicy } from '../src/policies/UserPolicy.js';",
      );
      auth = auth.replace('policies: {},', 'policies: {\n    User: UserPolicy,\n  },');
    }

    await fsWriteFile(authPath, auth);
  }

  private async patchMainEntry(root: string): Promise<void> {
    const mainPath = projectPath(root, 'src/main.ts');
    let main = await readFile(mainPath, 'utf8');

    if (!main.includes('AdminPanelServiceProvider')) {
      main = main.replace(
        "import { AppServiceProvider } from './providers/app-service-provider.js';",
        "import { AppServiceProvider } from './providers/app-service-provider.js';\nimport { AdminPanelServiceProvider } from './providers/admin-service-provider.js';",
      );
      main = main.replace(
        'app.register(AppServiceProvider);',
        `${adminLazyRegistration()}\napp.register(AppServiceProvider);`,
      );
    }

    if (!main.includes('routes/admin')) {
      const routeImport = "import './routes/admin.js';";
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

    if (!provider.includes('registerAdminResources')) {
      provider = provider.replace(
        "import { ServiceProvider } from '@pondoknusa/core';",
        "import { ServiceProvider } from '@pondoknusa/core';\nimport { AdminRegistry } from '@pondoknusa/admin';\nimport { registerAdminResources } from '../admin/resources.js';",
      );

      if (provider.includes('override boot()')) {
        provider = provider.replace(
          'override boot() {',
          'override boot() {\n    registerAdminResources(this.app.make(AdminRegistry));',
        );
      } else {
        provider = provider.replace(
          /}\s*$/,
          "\n\n  override boot() {\n    registerAdminResources(this.app.make(AdminRegistry));\n  }\n}\n",
        );
      }
    }

    await fsWriteFile(providerPath, provider);
  }
}