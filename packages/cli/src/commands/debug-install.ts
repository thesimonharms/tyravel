import { readFile, writeFile as fsWriteFile } from 'node:fs/promises';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { debugConfig, debugLazyRegistration, debugPanelServiceProvider } from '../stubs.js';
import { projectPath, writeFile, pathExists } from '../utils.js';

export class DebugInstallCommand extends Command {
  override readonly name = 'debug:install';
  override readonly description = 'Scaffold debug bar, timeline routes, and config';
  override readonly usage = 'pondoknusa debug:install';

  async handle(): Promise<number> {
    const root = await requireProjectRoot();

    const configPath = projectPath(root, 'config/debug.ts');
    if (await pathExists(configPath)) {
      console.error('config/debug.ts already exists.');
      return 1;
    }

    await writeFile(configPath, debugConfig());
    await writeFile(
      projectPath(root, 'src/providers/debug-service-provider.ts'),
      debugPanelServiceProvider(),
    );

    await this.patchMainEntry(root);

    console.log('Debug scaffolding installed.');
    console.log('');
    console.log('Next steps:');
    console.log('  npm install @pondoknusa/debug');
    console.log('  Set APP_DEBUG=true in .env');
    console.log('  Visit any HTML page to see the debug bar');
    console.log('  Open /__debug for recent request JSON');

    return 0;
  }

  private async patchMainEntry(root: string): Promise<void> {
    const mainPath = projectPath(root, 'src/main.ts');
    let main = await readFile(mainPath, 'utf8');

    if (!main.includes('DebugPanelServiceProvider')) {
      main = main.replace(
        "import { AppServiceProvider } from './providers/app-service-provider.js';",
        "import { AppServiceProvider } from './providers/app-service-provider.js';\nimport { DebugPanelServiceProvider } from './providers/debug-service-provider.js';",
      );
      main = main.replace(
        'app.register(AppServiceProvider);',
        `${debugLazyRegistration()}\napp.register(AppServiceProvider);`,
      );
    }

    await fsWriteFile(mainPath, main);
  }
}