import { readFile } from 'node:fs/promises';
import { pathExists, projectPath, writeFile } from './utils.js';

export async function registerComponentInProvider(
  root: string,
  className: string,
  tagName: string,
): Promise<boolean> {
  const providerPath = projectPath(root, 'src/providers/app-service-provider.ts');
  if (!(await pathExists(providerPath))) {
    return false;
  }

  let source = await readFile(providerPath, 'utf8');
  const componentImport = `import { ${className} } from '../components/${className}.js';`;
  const registration = `    View.component('${tagName}', this.app.make(${className}));`;

  if (!source.includes(componentImport)) {
    const lastImport = source.lastIndexOf('\nimport ');
    if (lastImport === -1) {
      source = `${componentImport}\n${source}`;
    } else {
      const endOfImport = source.indexOf('\n', lastImport + 1);
      const insertAt = endOfImport === -1 ? source.length : endOfImport + 1;
      source = `${source.slice(0, insertAt)}${componentImport}\n${source.slice(insertAt)}`;
    }
  }

  if (!/\bView\b/.test(source)) {
    const coreImport = /import\s*\{([^}]+)\}\s*from\s*'@tyravel\/core';/;
    if (coreImport.test(source)) {
      source = source.replace(coreImport, (_match, imports: string) => {
        const trimmed = imports.trim().replace(/,\s*$/, '');
        return `import { ${trimmed}, View } from '@tyravel/core';`;
      });
    } else {
      source = `import { View } from '@tyravel/core';\n${source}`;
    }
  }

  if (!source.includes(registration.trim())) {
    if (source.includes('override boot()')) {
      source = source.replace(
        /override boot\(\)\s*\{/,
        `override boot() {\n${registration}`,
      );
    } else {
      source = source.replace(
        /}\s*$/,
        `  override boot() {\n${registration}\n  }\n}\n`,
      );
    }
  }

  await writeFile(providerPath, source);
  return true;
}