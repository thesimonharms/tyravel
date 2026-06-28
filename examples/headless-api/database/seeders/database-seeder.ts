import { Hasher } from '@tyravel/auth';
import { Seeder } from '@tyravel/database';
import { User } from '../../src/models/User.js';

export default class DatabaseSeeder extends Seeder {
  override async run(): Promise<void> {
    const existing = await User.query().where('email', 'demo@tyravel.dev').first();
    if (existing) {
      return;
    }

    const hasher = new Hasher();
    await User.create({
      name: 'Demo User',
      email: 'demo@tyravel.dev',
      password: hasher.make('password'),
    });
  }
}