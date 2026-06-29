import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { optionString } from './utils.js';

export type DatabaseDriver = 'sqlite' | 'mysql' | 'postgres';
export type QueueDriver = 'database' | 'redis';
export type MailDriver = 'log' | 'smtp' | 'array';

import type { ProjectTemplate } from './stubs-templates.js';

export interface NewProjectOptions {
  database: DatabaseDriver;
  redis: boolean;
  auth: boolean;
  queue: QueueDriver;
  mail: MailDriver;
  ai: boolean;
  template: ProjectTemplate;
  headless: boolean;
}

const DATABASE_CHOICES: { value: DatabaseDriver; label: string }[] = [
  { value: 'sqlite', label: 'SQLite (no extra dependencies)' },
  { value: 'mysql', label: 'MySQL (+ @pondoknusa/database-mysql)' },
  { value: 'postgres', label: 'PostgreSQL (+ @pondoknusa/database-pg)' },
];

const QUEUE_CHOICES: { value: QueueDriver; label: string }[] = [
  { value: 'database', label: 'Database (uses jobs table, durable)' },
  { value: 'redis', label: 'Redis (requires redis driver)' },
];

const MAIL_CHOICES: { value: MailDriver; label: string }[] = [
  { value: 'log', label: 'Log (writes to log file, no SMTP)' },
  { value: 'smtp', label: 'SMTP (send real emails)' },
  { value: 'array', label: 'Array (in-memory, for testing)' },
];

export async function resolveNewProjectOptions(
  options: Record<string, string | boolean>,
): Promise<NewProjectOptions> {
  const dbFlag = optionString(options, 'db');
  const hasDbFlag = dbFlag !== undefined;
  const hasRedisFlag = options.redis !== undefined || options['no-redis'] === true;
  const hasAuthFlag = options.auth !== undefined || options['no-auth'] === true;
  const hasQueueFlag = optionString(options, 'queue') !== undefined;
  const hasMailFlag = optionString(options, 'mail') !== undefined;
  const hasAiFlag = options.ai !== undefined || options['no-ai'] === true;
  const hasTemplateFlag = optionString(options, 'template') !== undefined;
  let database: DatabaseDriver = 'sqlite';
  let redis = false;
  let auth = true;
  let queue: QueueDriver = 'database';
  let mail: MailDriver = 'log';
  let ai = false;
  let template: ProjectTemplate = 'default';
  let headless = false;

  if (options.headless === true) {
    headless = true;
    template = 'headless';
  }

  if (optionString(options, 'template')) {
    const { parseProjectTemplate } = await import('./stubs-templates.js');
    template = parseProjectTemplate(optionString(options, 'template'));
    headless = template === 'headless';
  }

  if (hasDbFlag) {
    database = parseDatabaseDriver(dbFlag);
  }

  if (options.redis === true) {
    redis = true;
  } else if (options['no-redis'] === true) {
    redis = false;
  }

  if (options['no-auth'] === true) {
    auth = false;
  }

  if (optionString(options, 'queue')) {
    queue = parseQueueDriver(optionString(options, 'queue')!);
  }

  if (optionString(options, 'mail')) {
    mail = parseMailDriver(optionString(options, 'mail')!);
  }

  if (options.ai === true) {
    ai = true;
  } else if (options['no-ai'] === true) {
    ai = false;
  }

  const interactive = process.stdin.isTTY && process.stdout.isTTY;

  if (
    interactive
    && (!hasDbFlag || !hasRedisFlag || !hasAuthFlag || !hasQueueFlag || !hasMailFlag || !hasAiFlag || !hasTemplateFlag)
  ) {
    const rl = createInterface({ input, output });
    try {
      if (!hasTemplateFlag) {
        console.log('');
        console.log('Select a project template:');
        console.log('  default - JSON API starter');
        console.log('  api     - API-only routes');
        console.log('  ssr     - Server-rendered welcome page');
        console.log('  saas     - Auth-ready SaaS starter');
        console.log('  headless - Backend-only API (no views or client assets)');
        const answer = (await rl.question('Template [default]: ')).trim();
        const { parseProjectTemplate } = await import('./stubs-templates.js');
        template = parseProjectTemplate(answer || 'default');
      }

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
        const answer = (await rl.question('Use Redis for cache/queue? [y/N]: ')).trim().toLowerCase();
        redis = answer === 'y' || answer === 'yes';
      }

      if (!hasAuthFlag) {
        const answer = (await rl.question('Include authentication scaffold? [Y/n]: ')).trim().toLowerCase();
        auth = answer !== 'n' && answer !== 'no';
      }

      if (!hasQueueFlag) {
        console.log('');
        console.log('Select a queue driver:');
        for (const choice of QUEUE_CHOICES) {
          const marker = choice.value === 'database' ? ' (default)' : '';
          console.log(`  ${choice.value}${marker} - ${choice.label}`);
        }
        const answer = (await rl.question('Queue driver [database]: ')).trim();
        queue = answer ? parseQueueDriver(answer) : 'database';
      }

      if (!hasMailFlag) {
        console.log('');
        console.log('Select a mail driver:');
        for (const choice of MAIL_CHOICES) {
          const marker = choice.value === 'log' ? ' (default)' : '';
          console.log(`  ${choice.value}${marker} - ${choice.label}`);
        }
        const answer = (await rl.question('Mail driver [log]: ')).trim();
        mail = answer ? parseMailDriver(answer) : 'log';
      }

      if (!hasAiFlag) {
        const answer = (await rl.question('Include AI/RAG scaffold (vector search + routes)? [y/N]: ')).trim().toLowerCase();
        ai = answer === 'y' || answer === 'yes';
      }
    } finally {
      rl.close();
    }
  }

  const { applyTemplateDefaults } = await import('./stubs-templates.js');
  return applyTemplateDefaults(template, {
    database,
    redis,
    auth,
    queue,
    mail,
    ai,
    template,
    headless: headless || template === 'headless',
  });
}

function parseDatabaseDriver(value: string): DatabaseDriver {
  if (value === 'sqlite' || value === 'mysql' || value === 'postgres') {
    return value;
  }
  throw new Error(`Unsupported database driver "${value}". Use sqlite, mysql, or postgres.`);
}

function parseQueueDriver(value: string): QueueDriver {
  if (value === 'database' || value === 'redis') {
    return value;
  }
  throw new Error(`Unsupported queue driver "${value}". Use database or redis.`);
}

function parseMailDriver(value: string): MailDriver {
  if (value === 'log' || value === 'smtp' || value === 'array') {
    return value;
  }
  throw new Error(`Unsupported mail driver "${value}". Use log, smtp, or array.`);
}