import { collectLocaleKeys, diffMissingKeys } from '@pondoknusa/locale';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { parseOptions } from '../utils.js';

const REQUIRED_KEYS = [
  'messages.welcome',
  'validation.required',
  'validation.email',
  'auth.failed',
  'pagination.previous',
  'pagination.next',
];

export class LangMissingCommand extends Command {
  override readonly name = 'lang:missing';
  override readonly description = 'Report missing translation keys';
  override readonly usage = 'pondoknusa lang:missing [--strict]';

  async handle(args: string[]): Promise<number> {
    const options = parseOptions(args);
    const root = await requireProjectRoot();
    const present = await collectLocaleKeys(root, 'lang');
    const missing = diffMissingKeys(REQUIRED_KEYS, present);

    if (missing.length === 0) {
      console.log('All required translation keys are present.');
      return 0;
    }

    console.log('Missing translation keys:');
    for (const key of missing) {
      console.log(`  - ${key}`);
    }

    return options.strict === true ? 1 : 0;
  }
}