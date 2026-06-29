import type { EmbedFn } from '@pondoknusa/vector';

/**
 * Replace with your provider SDK (OpenAI, Anthropic, local model, etc.).
 * Pondoknusa intentionally does not ship a unified LLM interface.
 */
export const embed: EmbedFn = async (text) => {
  const dimensions = 8;
  const vector = new Array<number>(dimensions).fill(0);
  for (let i = 0; i < text.length; i++) {
    vector[i % dimensions] = (vector[i % dimensions] ?? 0) + text.charCodeAt(i) / 1000;
  }
  return vector;
};