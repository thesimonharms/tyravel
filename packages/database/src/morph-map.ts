import type { ModelStatic } from './model-types.js';

const morphMap = new Map<string, ModelStatic>();

export function registerMorphMap(map: Record<string, ModelStatic>): void {
  for (const [alias, model] of Object.entries(map)) {
    morphMap.set(alias, model);
  }
}

export function clearMorphMap(): void {
  morphMap.clear();
}

export function resolveMorphAlias(model: ModelStatic): string {
  const withAlias = model as ModelStatic & { morphName?: string };
  return withAlias.morphName ?? model.name;
}

export function resolveMorphModel(type: string): ModelStatic {
  const mapped = morphMap.get(type);
  if (mapped) {
    return mapped;
  }

  throw new Error(`No morph model registered for type [${type}]. Use registerMorphMap().`);
}