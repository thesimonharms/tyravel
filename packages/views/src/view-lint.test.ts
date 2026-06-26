import { afterEach, describe, expect, it } from 'vitest';
import {
  lintHasErrors,
  lintViewSource,
  resolveViewLintStrict,
} from './view-lint.js';

describe('view lint severity', () => {
  const originalCi = process.env.CI;
  const originalStrict = process.env.TYRAVEL_VIEW_LINT_STRICT;

  afterEach(() => {
    if (originalCi === undefined) {
      delete process.env.CI;
    } else {
      process.env.CI = originalCi;
    }

    if (originalStrict === undefined) {
      delete process.env.TYRAVEL_VIEW_LINT_STRICT;
    } else {
      process.env.TYRAVEL_VIEW_LINT_STRICT = originalStrict;
    }
  });

  it('treats unclosed directives and unknown components as errors by default', async () => {
    const issues = await lintViewSource(
      `@push('scripts')
@component('missing.alert')
`,
      { componentExists: () => false },
    );

    expect(issues.every((issue) => issue.severity === 'error')).toBe(true);
    expect(lintHasErrors(issues)).toBe(true);
  });

  it('downgrades advisory rules to warnings outside strict mode', async () => {
    delete process.env.CI;
    delete process.env.TYRAVEL_VIEW_LINT_STRICT;

    const issues = await lintViewSource(`{!! userInput !!}\n`);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.rule).toBe('unsafe-raw-echo');
    expect(issues[0]?.severity).toBe('warning');
    expect(lintHasErrors(issues)).toBe(false);
  });

  it('promotes advisory rules to errors in strict mode', async () => {
    const issues = await lintViewSource(`{!! userInput !!}\n`, { strict: true });

    expect(issues[0]?.severity).toBe('error');
    expect(lintHasErrors(issues)).toBe(true);
  });

  it('enables strict mode from CI env by default', () => {
    process.env.CI = 'true';
    expect(resolveViewLintStrict()).toBe(true);
  });
});