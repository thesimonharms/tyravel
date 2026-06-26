export function shouldRequireCompiledCache(
  config: Pick<import('./types.js').ViewConfig, 'requireCompiledCache'>,
  trustDiskCache: boolean,
): boolean {
  if (config.requireCompiledCache === false || !trustDiskCache) {
    return false;
  }

  return config.requireCompiledCache === true;
}