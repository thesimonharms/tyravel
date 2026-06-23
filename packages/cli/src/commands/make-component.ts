import { Command } from '../command.js';
import { requireProjectRoot } from '../project.js';
import { registerComponentInProvider } from '../component-provider.js';
import { componentClass, componentView } from '../stubs.js';
import { optionFlag, parseOptions, positionalArgs, projectPath, toKebabCase, toPascalCase, writeFile, pathExists } from '../utils.js';

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

    const root = await requireProjectRoot();
    const kebab = toKebabCase(rawName.replace(/\\/g, '/').split('/').pop() ?? rawName);
    const relativeView = `resources/views/components/${kebab}.tyr`;
    const target = projectPath(root, relativeView);

    if (await pathExists(target)) {
      console.error(`Component already exists: ${relativeView}`);
      return 1;
    }

    await writeFile(target, componentView(kebab));
    console.log(`Component created: ${relativeView}`);

    if (optionFlag(options, 'class')) {
      const className = `${toPascalCase(kebab)}Component`;
      const classTarget = projectPath(root, 'src/components', `${className}.ts`);

      if (await pathExists(classTarget)) {
        console.error(`Component class already exists: src/components/${className}.ts`);
        return 1;
      }

      await writeFile(classTarget, componentClass(className, kebab));
      console.log(`Component class created: src/components/${className}.ts`);

      if (await registerComponentInProvider(root, className, kebab)) {
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