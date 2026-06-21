import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { registerComponentInProvider } from '../component-provider.js';
import { componentClass, componentView } from '../stubs.js';
import {
  optionFlag,
  parseOptions,
  positionalArgs,
  projectPath,
  toKebabCase,
  toPascalCase,
  writeFile,
} from '../utils.js';

export class MakeComponentCommand extends Command {
  override readonly name = 'make:component';
  override readonly description = 'Create a new anonymous Tyr component template';
  override readonly usage = 'tyravel make:component <name> [--class]';

  async handle(args: string[]): Promise<number> {
    const options = parseOptions(args);
    const [rawName] = positionalArgs(args);

    if (!rawName) {
      console.error('Component name is required.');
      console.error('Usage: tyravel make:component <name> [--class]');
      return 1;
    }

    const root = requireProjectRoot();
    const kebab = toKebabCase(rawName.replace(/\\/g, '/').split('/').pop() ?? rawName);
    const relativeView = `resources/views/components/${kebab}.tyr`;
    const target = projectPath(root, relativeView);

    if (existsSync(target)) {
      console.error(`Component already exists: ${relativeView}`);
      return 1;
    }

    mkdirSync(dirname(target), { recursive: true });
    writeFile(target, componentView(kebab));
    console.log(`Component created: ${relativeView}`);

    if (optionFlag(options, 'class')) {
      const className = `${toPascalCase(kebab)}Component`;
      const classTarget = projectPath(root, 'src/components', `${className}.ts`);

      if (existsSync(classTarget)) {
        console.error(`Component class already exists: src/components/${className}.ts`);
        return 1;
      }

      writeFile(classTarget, componentClass(className, kebab));
      console.log(`Component class created: src/components/${className}.ts`);

      if (registerComponentInProvider(root, className, kebab)) {
        console.log(`Registered View.component('${kebab}') in AppServiceProvider`);
      } else {
        console.log(
          `Add to AppServiceProvider boot(): View.component('${kebab}', this.app.make(${className}));`,
        );
      }
    }

    return 0;
  }
}