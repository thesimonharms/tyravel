import { readFile } from 'node:fs/promises';
import { pathExists, projectPath, writeFile } from './utils.js';

export async function registerIslandInClientBundle(
  root: string,
  islandId: string,
): Promise<boolean> {
  const appEntry = projectPath(root, 'resources/client/app.ts');
  const importLine = `import './islands/${islandId}.js';`;

  if (await pathExists(appEntry)) {
    let source = await readFile(appEntry, 'utf8');
    if (!source.includes(importLine)) {
      source = `${importLine}\n${source}`;
      await writeFile(appEntry, source);
    }
    return true;
  }

  const echoEntry = projectPath(root, 'resources/client/echo.ts');
  if (await pathExists(echoEntry)) {
    let source = await readFile(echoEntry, 'utf8');
    if (!source.includes(importLine)) {
      const hydrateImport = "import { hydrate } from '@pondoknusa/ssr';";
      source = source.includes(hydrateImport)
        ? `${importLine}\n${source}`
        : `${importLine}\n${hydrateImport}\n\nhydrate();\n`;
      await writeFile(echoEntry, source);
    }
    return true;
  }

  await writeFile(
    appEntry,
    `${importLine}
import { hydrate } from '@pondoknusa/ssr';

hydrate();
`,
  );

  return true;
}