#!/usr/bin/env node
/**
 * Prepare a Tyravel release.
 *
 * Usage:
 *   npm run release:prepare              # prompts for version
 *   npm run release:prepare -- 0.2.0     # explicit version
 *   npm run release:prepare -- patch     # bump from current
 *   npm run release:prepare -- minor
 *   npm run release:prepare -- major
 *
 * What it does:
 *   1. Verifies clean working tree
 *   2. Bumps version in all package.json files + CLI stubs
 *   3. Updates CHANGELOG.md (prepends a new section)
 *   4. Runs build + tests
 *   5. Commits, tags, and pushes (triggers the release workflow)
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── Helpers ─────────────────────────────────────────────────

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

function run(cmd, opts = {}) {
  const result = execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...opts });
  return result == null ? '' : result.trim();
}

function log(msg) {
  console.log(`\n▶ ${msg}`);
}

// ── Pre-flight ──────────────────────────────────────────────

const status = run('git status --porcelain');
if (status) {
  console.error('✗ Working tree is not clean. Commit or stash changes first.');
  process.exit(1);
}

const currentBranch = run('git branch --show-current');
if (currentBranch !== 'main') {
  console.error(`✗ Must be on main branch (currently on ${currentBranch}).`);
  process.exit(1);
}

// ── Determine version ───────────────────────────────────────

const rootPkg = readJson(join(ROOT, 'packages/core/package.json'));
const currentVersion = rootPkg.version;

const arg = process.argv[2];

let newVersion;
if (!arg) {
  console.log(`Current version: ${currentVersion}`);
  console.log('Usage: npm run release:prepare -- <version | patch | minor | major>');
  process.exit(1);
} else if (arg === 'patch' || arg === 'minor' || arg === 'major') {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  if (arg === 'patch') newVersion = `${major}.${minor}.${patch + 1}`;
  if (arg === 'minor') newVersion = `${major}.${minor + 1}.0`;
  if (arg === 'major') newVersion = `${major + 1}.0.0`;
} else {
  newVersion = arg;
  if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(newVersion)) {
    console.error(`✗ Invalid version: ${newVersion}`);
    process.exit(1);
  }
}

if (newVersion === currentVersion) {
  console.error(`✗ Version is already ${currentVersion}`);
  process.exit(1);
}

log(`Releasing v${newVersion} (from v${currentVersion})`);

// ── Bump versions ───────────────────────────────────────────

log('Bumping package versions');

const pkgDirs = [
  ...readdirSync(join(ROOT, 'packages')).map((d) => join(ROOT, 'packages', d)),
  join(ROOT, 'examples/hello-world'),
  join(ROOT, 'examples/rag'),
];

let bumped = 0;
for (const dir of pkgDirs) {
  const pkgPath = join(dir, 'package.json');
  let pkg;
  try {
    pkg = readJson(pkgPath);
  } catch {
    continue;
  }

  let changed = false;

  if (pkg.version && pkg.name?.startsWith('@tyravel/')) {
    pkg.version = newVersion;
    changed = true;
  }

  // Bump @tyravel/* deps
  for (const depType of ['dependencies', 'devDependencies', 'peerDependencies']) {
    if (!pkg[depType]) continue;
    for (const [name, version] of Object.entries(pkg[depType])) {
      const match = String(version).match(/^(\^|~)?(\d+\.\d+\.\d+)/);
      if (name.startsWith('@tyravel/') && match) {
        // Preserve range prefix for scaffolded app stubs
        pkg[depType][name] = `${match[1] ?? ''}${newVersion}`;
        changed = true;
      }
    }
  }

  if (changed) {
    writeJson(pkgPath, pkg);
    bumped++;
  }
}

// Bump version references in stubs.ts (scaffolded apps)
const stubsPath = join(ROOT, 'packages/cli/src/stubs.ts');
let stubs = readFileSync(stubsPath, 'utf8');
stubs = stubs.replaceAll(`^${currentVersion}`, `^${newVersion}`);
stubs = stubs.replaceAll(`"${currentVersion}"`, `"${newVersion}"`);
writeFileSync(stubsPath, stubs);

const stubsProjectPath = join(ROOT, 'packages/cli/src/stubs-project.ts');
let stubsProject = readFileSync(stubsProjectPath, 'utf8');
stubsProject = stubsProject.replace(
  /const CORE_VERSION = '\^[\d.]+';/,
  `const CORE_VERSION = '^${newVersion}';`,
);
writeFileSync(stubsProjectPath, stubsProject);

const manifestPath = join(ROOT, 'packages/mcp/src/manifest.ts');
let manifest = readFileSync(manifestPath, 'utf8');
manifest = manifest.replace(
  /version: overrides\.version \?\? '[\d.]+'/,
  `version: overrides.version ?? '${newVersion}'`,
);
writeFileSync(manifestPath, manifest);

console.log(`  Bumped ${bumped} package.json files + stubs.ts + stubs-project.ts + manifest.ts`);

log('Syncing package-lock.json');
run('npm install', { stdio: 'inherit' });

// ── Update CHANGELOG ────────────────────────────────────────

log('Updating CHANGELOG.md');

const today = new Date().toISOString().slice(0, 10);
const changelogPath = join(ROOT, 'CHANGELOG.md');
const changelog = readFileSync(changelogPath, 'utf8');

const newSection = `## [${newVersion}] - ${today}\n\nSee [v${newVersion} release notes](https://github.com/thesimonharms/tyravel/releases/tag/v${newVersion}).\n`;

const tagLink = `[${newVersion}]: https://github.com/thesimonharms/tyravel/releases/tag/v${newVersion}`;
let updated;
if (changelog.includes(`## [${newVersion}]`)) {
  // Section already exists (e.g. running twice) — skip
  console.log('  CHANGELOG already has this version — skipping');
  updated = changelog;
} else {
  // Insert after the header, before the first ## section
  const firstSectionIdx = changelog.indexOf('\n## [');
  if (firstSectionIdx === -1) {
    updated = changelog + '\n' + newSection + '\n' + tagLink;
  } else {
    updated =
      changelog.slice(0, firstSectionIdx + 1) +
      '\n' + newSection +
      changelog.slice(firstSectionIdx + 1);
  }
  // Update or append tag link at the end
  if (updated.includes(`[${newVersion}]:`)) {
    updated = updated.replace(
      new RegExp(`\\[${newVersion}\\]:.*`, 'g'),
      tagLink,
    );
  } else {
    updated = updated.trimEnd() + '\n' + tagLink + '\n';
  }
}

writeFileSync(changelogPath, updated);
console.log('  CHANGELOG.md updated');

// ── Build + Test ────────────────────────────────────────────

log('Building');
run('npm run build', { stdio: 'inherit' });

log('Testing');
run('npm test', { stdio: 'inherit' });

// ── Commit, tag, push ───────────────────────────────────────

log('Committing');
run('git add -A');
run(`git commit -m "chore(release): v${newVersion}"`);

log('Tagging');
run(`git tag v${newVersion} -m "v${newVersion}"`);

log('Pushing to origin');
run('git push origin main --tags');

console.log(`\n✅ Released v${newVersion}`);
console.log('   GitHub Actions will publish to npm automatically.');
console.log('   https://github.com/thesimonharms/tyravel/actions');
