type EnvDefault = string | number | boolean | null | undefined;

export function env(key: string): string | undefined;
export function env(key: string, defaultValue: string): string;
export function env<T extends EnvDefault>(key: string, defaultValue: T): T;
export function env<T extends EnvDefault>(key: string, defaultValue?: T): T | string | undefined {
  const raw = process.env[key];

  if (raw === undefined) {
    return defaultValue;
  }

  if (raw === '') {
    return defaultValue ?? '';
  }

  if (defaultValue === undefined) {
    return raw;
  }

  return castEnvValue(raw, defaultValue);
}

export function envBool(key: string, defaultValue = false): boolean {
  const value = env(key);
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return parseBool(value);
}

export function envInt(key: string, defaultValue: number): number {
  const value = env(key);
  if (value === undefined || value === '') {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

function castEnvValue<T extends EnvDefault>(value: string, defaultValue: T): T {
  if (typeof defaultValue === 'boolean') {
    return parseBool(value) as T;
  }

  if (typeof defaultValue === 'number') {
    const parsed = Number(value);
    return (Number.isNaN(parsed) ? defaultValue : parsed) as T;
  }

  if (defaultValue === null && value.toLowerCase() === 'null') {
    return null as T;
  }

  return value as T;
}

function parseBool(value: string): boolean {
  switch (value.trim().toLowerCase()) {
    case '1':
    case 'true':
    case 'on':
    case 'yes':
      return true;
    case '0':
    case 'false':
    case 'off':
    case 'no':
      return false;
    default:
      return false;
  }
}