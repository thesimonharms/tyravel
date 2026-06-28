import { loadConfig } from '@tyravel/config';
import { resolveHeadlessMode } from '@tyravel/core';

export async function isHeadlessProject(root: string): Promise<boolean> {
  try {
    const config = await loadConfig(root, { validate: false });
    return resolveHeadlessMode(root, config);
  } catch {
    return resolveHeadlessMode(root);
  }
}