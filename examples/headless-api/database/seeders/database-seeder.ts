import { Hasher } from '@pondoknusa/auth';
import { Seeder } from '@pondoknusa/database';
import { User } from '../../src/models/User.js';

export default class DatabaseSeeder extends Seeder {
  override async run(): Promise<void> {
    const existing = await User.query().where('email', 'demo@pondoknusa.dev').first();
    if (existing) {
      return;
    }

    const hasher = new Hasher();
    await User.create({
      name: 'Demo User',
      email: 'demo@pondoknusa.dev',
      password: hasher.make('password'),
    });
  }
}