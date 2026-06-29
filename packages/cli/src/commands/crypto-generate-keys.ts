import { CryptoManager, serializeKeyMaterial } from '@pondoknusa/crypto';
import type { CryptoAlgorithm } from '@pondoknusa/crypto';
import { Command } from '../command.js';
import { optionString, parseOptions } from '../utils.js';

const SUPPORTED_ALGORITHMS: CryptoAlgorithm[] = [
  'ml-kem-512',
  'ml-kem-768',
  'ml-kem-1024',
  'hybrid-x25519-ml-kem-768',
  'ml-dsa-44',
  'ml-dsa-65',
  'ml-dsa-87',
  'slh-dsa-sha2-128f',
  'slh-dsa-sha2-128s',
  'slh-dsa-sha2-192f',
  'slh-dsa-sha2-192s',
  'slh-dsa-sha2-256f',
  'slh-dsa-sha2-256s',
];

export class CryptoGenerateKeysCommand extends Command {
  override readonly name = 'crypto:generate-keys';
  override readonly description = 'Generate post-quantum key material';
  override readonly usage =
    'pondoknusa crypto:generate-keys [--algorithm=hybrid-x25519-ml-kem-768] [--format=json|env]';

  async handle(args: string[]): Promise<number> {
    const options = parseOptions(args);
    const algorithm = (optionString(options, 'algorithm') ??
      'hybrid-x25519-ml-kem-768') as CryptoAlgorithm;
    const format = optionString(options, 'format') ?? 'json';

    if (!SUPPORTED_ALGORITHMS.includes(algorithm)) {
      console.error(`Unsupported algorithm: ${algorithm}`);
      console.error(`Supported: ${SUPPORTED_ALGORITHMS.join(', ')}`);
      return 1;
    }

    const crypto = new CryptoManager();
    const keys = crypto.generateKeys(algorithm);
    const serialized = serializeKeyMaterial(keys);

    if (format === 'json') {
      console.log(JSON.stringify(serialized, null, 2));
      return 0;
    }

    if (format === 'env') {
      if (algorithm.startsWith('ml-dsa') || algorithm.startsWith('slh-dsa')) {
        console.log(`OAUTH_TOKEN_PUBLIC_KEY=${serialized.publicKey}`);
        console.log(`OAUTH_TOKEN_SECRET_KEY=${serialized.secretKey}`);
        return 0;
      }

      console.error('--format=env is only supported for signing algorithms (ml-dsa-*, slh-dsa-*).');
      console.error('Use --format=json for KEM / hybrid keys.');
      return 1;
    }

    console.error(`Unsupported format: ${format}`);
    return 1;
  }
}