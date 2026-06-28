#!/usr/bin/env node
import { appendFileSync, readFileSync } from 'node:fs';

const reportPath = process.argv[2] ?? 'benchmark-report.json';
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const lines = report.results.map(
  (result) => `- ${result.label}: ${result.value.toLocaleString()} ${result.unit}`,
);

const summary = [
  '## Tyravel benchmarks',
  '',
  `Node ${report.node} on ${report.platform}/${report.arch}${report.quick ? ' (quick mode)' : ''}`,
  '',
  ...lines,
  '',
].join('\n');

const target = process.env.GITHUB_STEP_SUMMARY;
if (target) {
  appendFileSync(target, summary);
}

console.log(summary);