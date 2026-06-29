import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { socialDriverStub } from '../stubs.js';
import { parseOptions, positionalArgs, projectPath, toKebabCase, toPascalCase, writeFile, pathExists } from '../utils.js';

export class MakeSocialDriverCommand extends Command {
  override readonly name = 'make:social-driver';
  override readonly description = 'Scaffold a custom social OAuth driver';
  override readonly usage = 'pondoknusa make:social-driver <provider>';

  async handle(args: string[]): Promise<number> {
    void parseOptions(args);
    const [rawName] = positionalArgs(args);

    if (!rawName) {
      console.error('Provider name is required.');
      console.error('Usage: pondoknusa make:social-driver <provider>');
      return 1;
    }

    const root = await requireProjectRoot();
    const providerName = toKebabCase(rawName);
    const className = `${toPascalCase(providerName)}OAuthDriver`;
    const target = projectPath(root, 'app/social/drivers', `${className}.ts`);

    if (await pathExists(target)) {
      console.error(`Social OAuth driver already exists: app/social/drivers/${className}.ts`);
      return 1;
    }

    await writeFile(target, socialDriverStub(providerName, className));

    console.log(`Social OAuth driver created: app/social/drivers/${className}.ts`);
    console.log('');
    console.log('Register the driver during boot:');
    console.log(`  import { registerOAuthDriver } from '@pondoknusa/auth';`);
    console.log(`  import { ${className} } from '../social/drivers/${className}.js';`);
    console.log(`  registerOAuthDriver('${providerName}', ${className});`);
    console.log('');
    console.log('Then add the provider to config/auth.ts under oauth.providers.');

    return 0;
  }
}