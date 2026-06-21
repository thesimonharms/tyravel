import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { optionString } from './utils.js';

export type DatabaseDriver = 'sqlite' | 'mysql' | 'postgres';

export interface NewProjectOptions {
  database: DatabaseDriver;
  redis: boolean;
}

const DATABASE_CHOICES: { value: DatabaseDriver; label: string }[] = [
  { value: 'sqlite', label: 'SQLite (no extra dependencies)' },
  { value: 'mysql', label: 'MySQL (+ @tyravel/database-mysql)' },
  { value: 'postgres', label: 'PostgreSQL (+ @tyravel/database-pg)' },
];

export async function resolveNewProjectOptions(
  options: Record<string, string | boolean>,
): Promise<NewProjectOptions> {
  const dbFlag = optionString(options, 'db');
  const hasDbFlag = dbFlag !== undefined;
  const hasRedisFlag = options.redis !== undefined || options['no-redis'] === true;

  let database: DatabaseDriver = 'sqlite';
  let redis = false;

  if (hasDbFlag) {
    database = parseDatabaseDriver(dbFlag);
  }

  if (options.redis === true) {
    redis = true;
  } else if (options['no-redis'] === true) {
    redis = false;
  }

  const interactive = process.stdin.isTTY && process.stdout.isTTY;

  if (interactive && (!hasDbFlag || !hasRedisFlag)) {
    const rl = createInterface({ input, output });
    try {
      if (!hasDbFlag) {
        console.log('');
        console.log('Select a database driver:');
        for (const choice of DATABASE_CHOICES) {
          const marker = choice.value === 'sqlite' ? ' (default)' : '';
          console.log(`  ${choice.value}${marker} - ${choice.label}`);
        }
        const answer = (await rl.question('Database [sqlite]: ')).trim();
        database = answer ? parseDatabaseDriver(answer) : 'sqlite';
      }

      if (!hasRedisFlag) {
        const answer = (await rl.question('Use Redis? [y/N]: ')).trim().toLowerCase();
        redis = answer === 'y' || answer === 'yes';
      }
    } finally {
      rl.close();
    }
  }

  return { database, redis };
}

function parseDatabaseDriver(value: string): DatabaseDriver {
  if (value === 'sqlite' || value === 'mysql' || value === 'postgres') {
    return value;
  }

  throw new Error(`Unsupported database driver "${value}". Use sqlite, mysql, or postgres.`);
}