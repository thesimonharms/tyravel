import type { ModelStatic } from '@pondoknusa/database';

const models = new Map<string, ModelStatic>();

export function registerEmbedModel(name: string, model: ModelStatic): void {
  models.set(name, model);
}

export function resolveEmbedModel(name: string): ModelStatic | undefined {
  return models.get(name);
}

export function clearEmbedModels(): void {
  models.clear();
}