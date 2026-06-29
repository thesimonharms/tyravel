#!/usr/bin/env node

import { createKernel } from '../kernel.js';

const code = await createKernel().run(process.argv.slice(2));
process.exit(code);