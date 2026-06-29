import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { Seeder } from './seeder.js';
import { SeederRunner } from './seeder-runner.js';

const tempDirs: string[] = [];

function createSeedersDir(seeders: Record<string, string>): string {
  const dir = join(tmpdir(), `pondoknusa-seeders-${Date.now()}-${Math.random()}`);
  mkdirSync(dir, { recursive: true });

  for (const [fileName, contents] of Object.entries(seeders)) {
    writeFileSync(join(dir, fileName), contents, 'utf8');
  }

  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  tempDirs.length = 0;
});

describe('SeederRunner', () => {
  it('runs the requested seeder class', async () => {
    const dir = createSeedersDir({
      'database-seeder.js': `
        export class DatabaseSeeder {
          async run() {
            globalThis.__seeded = true;
          }
        }
      `,
    });

    const runner = new SeederRunner(dir);
    const ran = await runner.run('DatabaseSeeder');

    expect(ran).toBe('DatabaseSeeder');
    expect((globalThis as { __seeded?: boolean }).__seeded).toBe(true);
    delete (globalThis as { __seeded?: boolean }).__seeded;
  });

  it('delegates to other seeders via call()', async () => {
    class UserSeeder extends Seeder {
      override async run(): Promise<void> {
        (globalThis as { __userSeeded?: boolean }).__userSeeded = true;
      }
    }

    class DatabaseSeeder extends Seeder {
      override async run(): Promise<void> {
        await this.call(UserSeeder);
      }
    }

    await new DatabaseSeeder().run();
    expect((globalThis as { __userSeeded?: boolean }).__userSeeded).toBe(true);
    delete (globalThis as { __userSeeded?: boolean }).__userSeeded;
  });

  it('throws when the seeder class is missing', async () => {
    const dir = createSeedersDir({});
    const runner = new SeederRunner(dir);

    await expect(runner.run('MissingSeeder')).rejects.toThrow(
      'Seeder [MissingSeeder] not found',
    );
  });
});