#!/usr/bin/env node
/**
 * Deprecate all legacy @tyravel/* packages on npm after the Pondoknusa rebrand.
 *
 * Usage:
 *   NODE_AUTH_TOKEN=<token> node scripts/deprecate-tyravel.mjs
 *   NODE_AUTH_TOKEN=<token> node scripts/deprecate-tyravel.mjs --dry-run
 */

import { execSync } from 'node:child_process';

const DRY_RUN = process.argv.includes('--dry-run');

const LEGACY_PACKAGES = [
  '@tyravel/container',
  '@tyravel/collection',
  '@tyravel/support',
  '@tyravel/config',
  '@tyravel/log',
  '@tyravel/locale',
  '@tyravel/http',
  '@tyravel/validation',
  '@tyravel/database',
  '@tyravel/database-mysql',
  '@tyravel/database-pg',
  '@tyravel/redis',
  '@tyravel/redis-node',
  '@tyravel/views',
  '@tyravel/ssr',
  '@tyravel/echo',
  '@tyravel/queue',
  '@tyravel/events',
  '@tyravel/broadcasting',
  '@tyravel/broadcasting-websocket',
  '@tyravel/vector',
  '@tyravel/vector-pg',
  '@tyravel/vector-qdrant',
  '@tyravel/vector-pinecone',
  '@tyravel/rag',
  '@tyravel/graphql',
  '@tyravel/mcp',
  '@tyravel/crypto',
  '@tyravel/auth',
  '@tyravel/cache',
  '@tyravel/storage',
  '@tyravel/storage-aws-s3',
  '@tyravel/storage-r2',
  '@tyravel/storage-supabase',
  '@tyravel/mail',
  '@tyravel/notifications',
  '@tyravel/admin',
  '@tyravel/debug',
  '@tyravel/testing',
  '@tyravel/core',
  '@tyravel/auth-oauth',
  '@tyravel/repl',
  '@tyravel/cli',
];

const UNSCOPED = ['create-tyravel'];

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function packageExists(name) {
  try {
    run(`npm view "${name}" version`);
    return true;
  } catch {
    return false;
  }
}

let deprecated = 0;
let skipped = 0;

for (const pkg of [...LEGACY_PACKAGES, ...UNSCOPED]) {
  if (!packageExists(pkg)) {
    console.log(`⏭  ${pkg} not on npm — skipping`);
    skipped++;
    continue;
  }

  const target = pkg.startsWith('@tyravel/')
    ? `@pondoknusa/${pkg.slice('@tyravel/'.length)}`
    : 'create-pondoknusa';
  const msg = pkg.startsWith('@tyravel/')
    ? `Renamed to ${target} — see https://github.com/pondoknusa/pondoknusa/releases/tag/v2.0.0`
    : 'Renamed to create-pondoknusa — use: npm create pondoknusa';

  if (DRY_RUN) {
    console.log(`[dry-run] npm deprecate ${pkg} "${msg}"`);
    deprecated++;
    continue;
  }

  try {
    run(`npm deprecate "${pkg}" "${msg}"`);
    console.log(`✅ Deprecated ${pkg}`);
    deprecated++;
  } catch (err) {
    console.error(`✗ Failed to deprecate ${pkg}: ${err.stderr ?? err.message}`);
  }
}

console.log('');
console.log(`Deprecated: ${deprecated}`);
console.log(`Skipped:    ${skipped}`);