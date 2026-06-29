#!/usr/bin/env node
/**
 * Deprecate all legacy @tyravel/* packages on npm after the Pondoknusa rebrand.
 *
 * npm cannot rename packages — this marks old names as deprecated so installs
 * show a migration warning. New code publishes under @pondoknusa/* separately.
 *
 * Usage:
 *   # Recommended: Automation token (bypasses 2FA, works in CI)
 *   NODE_AUTH_TOKEN=<automation-token> node scripts/deprecate-tyravel.mjs
 *
 *   # Interactive login (requires 2FA OTP for each package batch)
 *   npm login
 *   node scripts/deprecate-tyravel.mjs --otp=123456
 *
 *   node scripts/deprecate-tyravel.mjs --dry-run
 */

import { execSync } from 'node:child_process';

const DRY_RUN = process.argv.includes('--dry-run');
const otpArg = process.argv.find((a) => a.startsWith('--otp='));
const otp = otpArg?.slice('--otp='.length) ?? process.env.NPM_OTP ?? '';
const otpFlag = otp ? ` --otp=${otp}` : '';

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
  return `Renamed to create-pondoknusa. Use: npm create pondoknusa`;
}

function explainFailure(pkg, detail) {
  if (/EOTP|one-time password/i.test(detail)) {
    return [
      `✗ ${pkg}: npm requires 2FA for this action.`,
      '  Use an Automation token (recommended):',
      '    NODE_AUTH_TOKEN=<token> node scripts/deprecate-tyravel.mjs',
      '  Or pass your authenticator code:',
      '    node scripts/deprecate-tyravel.mjs --otp=123456',
    ].join('\n');
  }
  if (/E404|404 Not Found.*PUT/i.test(detail)) {
    return [
      `✗ ${pkg}: not authorized to modify this package.`,
      '  Deprecation needs maintainer access on the @tyravel npm org.',
      '  Log in as the account that published @tyravel/*, or use its Automation token.',
    ].join('\n');
  }
  return `✗ ${pkg}: ${detail}`;
}

let deprecated = 0;
let skipped = 0;
let failed = 0;

if (!DRY_RUN && !process.env.NODE_AUTH_TOKEN && !otp) {
  console.warn(
    '⚠  No NODE_AUTH_TOKEN or --otp set. If npm login has 2FA enabled, deprecate will fail with EOTP.\n' +
      '   Create an Automation token at https://www.npmjs.com/settings/~tokens\n',
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
    run(`npm deprecate "${pkg}" "${msg}"${otpFlag}`);
    console.log(`✅ Deprecated ${pkg}`);
    deprecated++;
  } catch (err) {
    const detail = [err.stderr, err.stdout, err.message].filter(Boolean).join('\n').trim();
    console.error(explainFailure(pkg, detail));
    failed++;
    if (/EOTP|one-time password/i.test(detail)) {
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