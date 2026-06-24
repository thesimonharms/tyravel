export function tokenCan(ability: string, abilities: string[]): boolean {
  if (abilities.includes('*')) {
    return true;
  }

  return abilities.includes(ability);
}

export function tokenCanAny(required: string | string[], abilities: string[] | undefined): boolean {
  if (!abilities || abilities.length === 0) {
    return false;
  }

  const needed = Array.isArray(required) ? required : [required];
  return needed.every((ability) => tokenCan(ability, abilities));
}

export function parseTokenAbilities(raw: string | null | undefined): string[] {
  if (!raw) {
    return ['*'];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
      return ['*'];
    }
    return parsed;
  } catch {
    return ['*'];
  }
}