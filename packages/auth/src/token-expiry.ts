export function parseExpiresIn(
  input: string | number | Date | undefined,
): Date | undefined {
  if (input === undefined) {
    return undefined;
  }

  if (input instanceof Date) {
    return input;
  }

  if (typeof input === 'number') {
    return new Date(Date.now() + input * 24 * 60 * 60 * 1000);
  }

  const match = /^(\d+)([dhms])$/.exec(input.trim());
  if (!match) {
    throw new Error(`Invalid expiresIn value: ${input}`);
  }

  const amount = Number(match[1]);
  const unit = match[2] as 'd' | 'h' | 'm' | 's';
  const multipliers = {
    d: 24 * 60 * 60 * 1000,
    h: 60 * 60 * 1000,
    m: 60 * 1000,
    s: 1000,
  } as const;

  return new Date(Date.now() + amount * multipliers[unit]);
}