import type { PondoknusaConfig } from './project.js';

export interface PerfBudgetViolation {
  name: string;
  label: string;
  value: number;
  expected: string;
  unit: string;
}

interface BenchmarkResult {
  name: string;
  label: string;
  value: number;
  unit: string;
}

interface BenchmarkReport {
  results: BenchmarkResult[];
}

const LOWER_IS_BETTER = new Set(['boot.cold']);

export function evaluatePerfBudgets(
  report: BenchmarkReport,
  config: PondoknusaConfig,
): PerfBudgetViolation[] {
  const budgets = config.perf?.budgets;
  if (!budgets) {
    return [];
  }

  const violations: PerfBudgetViolation[] = [];

  for (const [name, budget] of Object.entries(budgets)) {
    const result = report.results.find((entry) => entry.name === name);
    if (!result) {
      continue;
    }

    const lowerIsBetter = LOWER_IS_BETTER.has(name) || budget.max !== undefined;

    if (budget.min !== undefined && !lowerIsBetter && result.value < budget.min) {
      violations.push({
        name,
        label: result.label,
        value: result.value,
        unit: result.unit,
        expected: `≥ ${budget.min} ${budget.unit ?? result.unit}`,
      });
    }

    if (budget.max !== undefined && result.value > budget.max) {
      violations.push({
        name,
        label: result.label,
        value: result.value,
        unit: result.unit,
        expected: `≤ ${budget.max} ${budget.unit ?? result.unit}`,
      });
    }
  }

  return violations;
}