export interface ConfigValidationFailure {
  config: string;
  path: string;
  message: string;
}

export class ConfigValidationError extends Error {
  readonly failures: ConfigValidationFailure[];

  constructor(failures: ConfigValidationFailure[]) {
    super(formatConfigValidationFailures(failures));
    this.name = 'ConfigValidationError';
    this.failures = failures;
  }
}

export function formatConfigValidationFailures(failures: ConfigValidationFailure[]): string {
  if (failures.length === 0) {
    return 'Configuration validation failed.';
  }

  const lines = failures.map(
    (failure) => `  - ${failure.config}.${failure.path}: ${failure.message}`,
  );
  return `Configuration validation failed:\n${lines.join('\n')}`;
}