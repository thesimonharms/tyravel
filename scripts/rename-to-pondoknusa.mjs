#!/usr/bin/env node
/**
 * One-shot rebrand: Tyravel -> Pondoknusa
 */

import { execSync } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  renameSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  '.vitepress/cache',
  'coverage',
]);

const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.yml',
  '.yaml',
  '.toml',
  '.sh',
  '.tyr',
  '.html',
  '.css',
  '.svg',
  '.snippets',
  '.tmLanguage.json',
  '.code-workspace',
]);

const REPLACEMENTS = [
  ['@tyravel/', '@pondoknusa/'],
  ['TyravelRequestPool', 'PondoknusaRequestPool'],
  ['TyravelRequest', 'PondoknusaRequest'],
  ['TyravelMcpServer', 'PondoknusaMcpServer'],
  ['TYRAVEL_', 'PONDOKNUSA_'],
  ['thesimonharms/tyravel', 'pondoknusa/pondoknusa'],
  ['tyravel.dev', 'pondoknusa.dev'],
  ['create-tyravel', 'create-pondoknusa'],
  ['vscode-tyravel', 'vscode-pondoknusa'],
  ['Tyravel', 'Pondoknusa'],
  ['tyravel', 'pondoknusa'],
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) {
      continue;
    }
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      walk(path, files);
      continue;
    }
    files.push(path);
  }
  return files;
}

function renamePath(from, to) {
  if (!existsSync(from)) {
    return;
  }
  if (existsSync(to)) {
    throw new Error(`Refusing to overwrite existing path: ${to}`);
  }
  renameSync(from, to);
  console.log(`renamed ${relative(ROOT, from)} -> ${relative(ROOT, to)}`);
}

function applyReplacements(content) {
  let next = content;
  for (const [from, to] of REPLACEMENTS) {
    next = next.split(from).join(to);
  }
  return next;
}

function shouldProcessFile(path) {
  const base = path.split('/').pop() ?? '';
  if (base === 'package-lock.json') {
    return false;
  }
  if (base.startsWith('rename-to-pondoknusa')) {
    return false;
  }
  if (/\.(ts|tsx|js|mjs|cjs|json|md|yml|yaml|toml|sh|tyr|html|css|svg|snippets|code-workspace)$/i.test(path)) {
    return true;
  }
  if (TEXT_EXTENSIONS.has(base.includes('.') ? `.${base.split('.').slice(1).join('.')}` : '')) {
    return true;
  }
  if (base === 'Dockerfile' || base === 'LICENSE' || base === 'README' || base === 'Makefile') {
    return true;
  }
  return false;
}

function renameDirectoriesAndFiles() {
  renamePath(join(ROOT, 'packages/create-tyravel'), join(ROOT, 'packages/create-pondoknusa'));
  renamePath(join(ROOT, 'tools/vscode-tyravel'), join(ROOT, 'tools/vscode-pondoknusa'));
  renamePath(join(ROOT, 'packages/cli/src/bin/tyravel.ts'), join(ROOT, 'packages/cli/src/bin/pondoknusa.ts'));

  for (const example of ['hello-world', 'rag', 'headless-api']) {
    renamePath(
      join(ROOT, 'examples', example, 'tyravel.json'),
      join(ROOT, 'examples', example, 'pondoknusa.json'),
    );
  }

  const snippetsFrom = join(ROOT, 'tools/vscode-pondoknusa/snippets/tyravel.code-snippets');
  const snippetsTo = join(ROOT, 'tools/vscode-pondoknusa/snippets/pondoknusa.code-snippets');
  renamePath(snippetsFrom, snippetsTo);
}

function processTextFiles() {
  const files = walk(ROOT);
  let changed = 0;

  for (const path of files) {
    if (!shouldProcessFile(path)) {
      continue;
    }

    const original = readFileSync(path, 'utf8');
    const updated = applyReplacements(original);
    if (updated !== original) {
      writeFileSync(path, updated);
      changed++;
    }
  }

  console.log(`updated ${changed} files`);
}

renameDirectoriesAndFiles();
processTextFiles();

try {
  execSync('npm install', { cwd: ROOT, stdio: 'inherit' });
} catch {
  console.error('npm install failed — run manually');
  process.exit(1);
}

console.log('Rebrand complete. Run npm run build && npm test next.');