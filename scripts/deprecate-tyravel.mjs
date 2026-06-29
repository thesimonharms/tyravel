#!/usr/bin/env node
/**
 * Deprecate all legacy @tyravel/* packages on npm after the Pondoknusa rebrand.
 *
 * npm cannot rename packages — this marks old names as deprecated so installs
 * show a migration warning. New code publishes under @pondoknusa/* separately.
 *
 * npm accounts use passkeys for interactive sign-in. Scripts and CI cannot use
 * passkeys — use a granular access token with "Bypass two-factor authentication"
 * and read-write access to the @tyravel scope.
 *
 * Usage:
 *   NODE_AUTH_TOKEN=<granular-token> node scripts/deprecate-tyravel.mjs
 *   node scripts/deprecate-tyravel.mjs --dry-run
 *
 * Create the token at https://www.npmjs.com/settings/~/tokens
 */

import { execSync } from 'node:child_process';

const DRY_RUN = process.argv.includes('--dry-run');

const MIGRATION_URL =
  'https://github.com/pondoknusa/pondoknusa/blob/main/README.md#migrating-from-tyravel';

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
  return execSync(cmd, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NPM_CONFIG_LOGLEVEL: 'warn',
    },
  }).trim();
}

function packageExists(name) {
  try {
    run(`npm view "${name}" version`);
    return true;
  } catch {
    return false;
  }
}

function migrationMessage(pkg) {
  if (pkg.startsWith('@tyravel/')) {
    const target = `@pondoknusa/${pkg.slice('@tyravel/'.length)}`;
    return `Renamed to ${target}. Migrate: ${MIGRATION_URL}`;
  }
  return 'Renamed to create-pondoknusa. Use: npm create pondoknusa';
}

function explainFailure(pkg, detail) {
  if (/EOTP|one-time password|passkey|webauthn/i.test(detail)) {
    return [
      `✗ ${pkg}: npm requires passkey sign-in for this action.`,
      '  Scripts cannot use passkeys. Create a granular access token instead:',
      '    https://www.npmjs.com/settings/~/tokens',
      '  Enable "Bypass two-factor authentication" and grant read-write on @tyravel/*',
      '    NODE_AUTH_TOKEN=<token> node scripts/deprecate-tyravel.mjs',
    ].join('\n');
  }
  if (/E404|404 Not Found.*PUT/i.test(detail)) {
    return [
      `✗ ${pkg}: not authorized to modify this package.`,
      '  Use a granular token from the account that maintains @tyravel/*',
      '  with read-write scope on those packages (org access alone is not enough).',
    ].join('\n');
  }
  return `✗ ${pkg}: ${detail}`;
}

let deprecated = 0;
let skipped = 0;
let failed = 0;

if (!DRY_RUN && !process.env.NODE_AUTH_TOKEN) {
  console.warn(
    '⚠  NODE_AUTH_TOKEN is not set.\n' +
      '   npm login uses passkeys and cannot authorize scripted deprecate/publish.\n' +
      '   Create a granular token: https://www.npmjs.com/settings/~/tokens\n',
  );
}

for (const pkg of [...LEGACY_PACKAGES, ...UNSCOPED]) {
  if (!packageExists(pkg)) {
    console.log(`⏭  ${pkg} not on npm — skipping`);
    skipped++;
    continue;
  }

  const msg = migrationMessage(pkg);

  if (DRY_RUN) {
    console.log(`[dry-run] npm deprecate ${pkg} "${msg}"`);
    deprecated++;
    continue;
  }

  try {
    // Omitting a version deprecates all published versions of the package.
    run(`npm deprecate "${pkg}" "${msg}"`);
    console.log(`✅ Deprecated ${pkg}`);
    deprecated++;
  } catch (err) {
    const detail = [err.stderr, err.stdout, err.message].filter(Boolean).join('\n').trim();
    console.error(explainFailure(pkg, detail));
    failed++;
    if (/EOTP|one-time password|passkey|webauthn/i.test(detail)) {
      break;
    }
  }
}

console.log('');
console.log(`Deprecated: ${deprecated}`);
console.log(`Skipped:    ${skipped}`);
console.log(`Failed:     ${failed}`);

if (failed > 0) {
  process.exit(1);
}