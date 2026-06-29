import type { Command } from './command.js';

export interface ParsedArgv {
  command?: string;
  args: string[];
  options: Record<string, string | boolean>;
}

export function parseArgv(argv: string[]): ParsedArgv {
  const options: Record<string, string | boolean> = {};
  const positional: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) {
      continue;
    }

    if (token.startsWith('--')) {
      const body = token.slice(2);
      const equalsIndex = body.indexOf('=');

      if (equalsIndex !== -1) {
        options[body.slice(0, equalsIndex)] = body.slice(equalsIndex + 1);
        continue;
      }

      const key = body;
      const next = argv[index + 1];

      if (!next || next.startsWith('--')) {
        options[key] = true;
        continue;
      }

      options[key] = next;
      index += 1;
      continue;
    }

    if (token.startsWith('-') && token.length > 1) {
      const key = token.slice(1);
      const next = argv[index + 1];

      if (!next || next.startsWith('-')) {
        options[key] = true;
        continue;
      }

      options[key] = next;
      index += 1;
      continue;
    }

    positional.push(token);
  }

  const [command, ...args] = positional;
  return { command, args, options };
}

export class ConsoleKernel {
  constructor(private readonly commands: Command[]) {}

  list(): Command[] {
    return [...this.commands].sort((left, right) => left.name.localeCompare(right.name));
  }

  async run(argv: string[]): Promise<number> {
    const parsed = parseArgv(argv);

    if (!parsed.command || parsed.command === 'list') {
      this.printHelp(parsed.command === 'list' ? this.list() : undefined);
      return 0;
    }

    if (parsed.command === 'help') {
      const target = parsed.args[0];
      if (!target) {
        this.printHelp();
        return 0;
      }

      const command = this.find(target);
      if (!command) {
        console.error(`Unknown command: ${target}`);
        return 1;
      }

      this.printCommandHelp(command);
      return 0;
    }

    const command = this.find(parsed.command);
    if (!command) {
      console.error(`Unknown command: ${parsed.command}`);
      console.error('Run `pondoknusa list` to see available commands.');
      return 1;
    }

    return command.handle([...parsed.args, ...optionsToArgs(parsed.options)]);
  }

  private find(name: string): Command | undefined {
    return this.commands.find((command) => command.name === name);
  }

  private printHelp(commands = this.list()): void {
    console.log('Pondoknusa CLI');
    console.log('');
    console.log('Usage:');
    console.log('  pondoknusa <command> [options] [arguments]');
    console.log('');
    console.log('Available commands:');

    const nameWidth = Math.max(...commands.map((command) => command.name.length), 'list'.length);

    for (const command of commands) {
      console.log(`  ${command.name.padEnd(nameWidth)}  ${command.description}`);
    }

    console.log(`  ${'list'.padEnd(nameWidth)}  List all available commands`);
    console.log(`  ${'help'.padEnd(nameWidth)}  Display help for a command`);
  }

  private printCommandHelp(command: Command): void {
    console.log(`Command: ${command.name}`);
    console.log(`Description: ${command.description}`);
    if (command.usage) {
      console.log(`Usage: ${command.usage}`);
    }
  }
}

function optionsToArgs(options: Record<string, string | boolean>): string[] {
  const args: string[] = [];

  for (const [key, value] of Object.entries(options)) {
    if (value === true) {
      args.push(`--${key}`);
      continue;
    }
    args.push(`--${key}`, String(value));
  }

  return args;
}