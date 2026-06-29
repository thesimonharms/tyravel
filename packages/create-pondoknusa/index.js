#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const cliEntry = require.resolve('@pondoknusa/cli/dist/bin/pondoknusa.js');
const args = ['new', ...process.argv.slice(2)];

const result = spawnSync(process.execPath, [cliEntry, ...args], {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);