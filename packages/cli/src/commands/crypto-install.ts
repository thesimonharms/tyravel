import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { cryptoConfig } from '../stubs.js';
import { projectPath, writeFile, pathExists } from '../utils.js';

export class CryptoInstallCommand extends Command {
  override readonly name = 'crypto:install';
  override readonly description = 'Scaffold post-quantum crypto configuration';
  override readonly usage = 'tyravel crypto:install';

  async handle(): Promise<number> {
    const root = await requireProjectRoot();

    const configPath = projectPath(root, 'config/crypto.ts');
    if (await pathExists(configPath)) {
      console.error('config/crypto.ts already exists.');
      return 1;
    }

    await writeFile(configPath, cryptoConfig());

    console.log('Crypto configuration installed.');
    console.log('');
    console.log('Next steps:');
    console.log('  npm install @tyravel/crypto');
    console.log('  tyravel crypto:generate-keys --algorithm=hybrid-x25519-ml-kem-768');
    console.log('  tyravel crypto:generate-keys --algorithm=ml-dsa-65');
    console.log('');
    console.log('Optional hardening in .env:');
    console.log('  SESSION_ENCRYPT=true');
    console.log('  SESSION_ENCRYPTION_KEY=<base64-key>');
    console.log('  OAUTH_SIGN_TOKENS=true');
    console.log('  OAUTH_TOKEN_PUBLIC_KEY=<base64-public-key>');
    console.log('  OAUTH_TOKEN_SECRET_KEY=<base64-secret-key>');

    return 0;
  }
}