#!/usr/bin/env node
/**
 * Compare benchmark JSON reports and warn on regressions.
 *
 * Usage:
 *   node scripts/benchmark-compare.mjs current.json [baseline.json]
 *
 * Exits 0 when within threshold or no baseline. Exits 0 with warnings printed
 * (non-blocking CI) when regressions exceed the drop threshold.
 */

import { appendFileSync, existsSync, readFileSync } from 'node:fs';

const DROP_THRESHOLD = 0.15;
const LOWER_IS_BETTER = new Set(['boot.cold']);

function loadReport(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function compareReports(current, baseline) {
  const warnings = [];

  for (const result of current.results) {
    const previous = baseline.results.find((entry) => entry.name === result.name);
    if (!previous || previous.value <= 0 || result.value <= 0) {
      continue;
    }

    const lowerIsBetter = LOWER_IS_BETTER.has(result.name);
    const delta = lowerIsBetter
      ? (result.value - previous.value) / previous.value
      : (previous.value - result.value) / previous.value;

    if (delta > DROP_THRESHOLD) {
      const direction = lowerIsBetter ? 'slower' : 'lower throughput';
      warnings.push({
        name: result.name,
        label: result.label,
        current: result.value,
        baseline: previous.value,
        unit: result.unit,
        dropPercent: Math.round(delta * 1000) / 10,
        direction,
      });
    }
  }

  return warnings;
}

function formatSummary(warnings) {
  if (warnings.length === 0) {
    return 'No benchmark regressions detected (>15% threshold).';
  }

  const lines = [
    '## Benchmark regressions (>15% drop)',
    '',
    ...warnings.map(
      (warning) =>
        `- **${warning.label}** (${warning.name}): ${warning.current.toLocaleString()} ${warning.unit}`
        + ` vs baseline ${warning.baseline.toLocaleString()} ${warning.unit}`
        + ` — ${warning.dropPercent}% ${warning.direction}`,
    ),
    '',
  ];

  return lines.join('\n');
}

function main() {
  const currentPath = process.argv[2] ?? 'benchmark-report.json';
  const baselinePath = process.argv[3] ?? 'benchmark-baseline.json';

  if (!existsSync(currentPath)) {
    console.error(`Current benchmark report not found: ${currentPath}`);
    process.exit(1);
  }

  if (!existsSync(baselinePath)) {
    console.log(`No baseline at ${baselinePath} — skipping comparison.`);
    process.exit(0);
  }

  const current = loadReport(currentPath);
  const baseline = loadReport(baselinePath);
  const warnings = compareReports(current, baseline);
  const summary = formatSummary(warnings);

  console.log(summary);

  const target = process.env.GITHUB_STEP_SUMMARY;
  if (target) {
    appendFileSync(target, `\n${summary}\n`);
  }
}

main();