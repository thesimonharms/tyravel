import { pathToFileURL } from 'node:url';
import type { ViewContext } from './types.js';

export interface ProgrammaticViewModule {
  render(context: ViewContext): string | Promise<string>;
}

export async function loadProgrammaticView(
  filePath: string,
): Promise<ProgrammaticViewModule> {
  const loaded = await import(pathToFileURL(filePath).href);
  const candidate = (loaded.render ?? loaded.default) as
    | ProgrammaticViewModule['render']
    | undefined;

  if (typeof candidate !== 'function') {
    throw new Error(
      `Programmatic view ${filePath} must export a render(context) function.`,
    );
  }

  return { render: candidate };
}