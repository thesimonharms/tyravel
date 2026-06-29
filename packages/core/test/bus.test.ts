import { describe, it, expect, beforeEach } from 'vitest';
import { Bus } from '../src/bus.js';
import { Container } from '@pondoknusa/container';

/* ──── Command Bus ───────────────────────────────────────────────────── */

describe('Bus', () => {
  beforeEach(() => {
    // Clean up mappings between tests
    Bus.forget('GreetCommand');
    Bus.forget('DoubleCommand');
    Bus.forget('PingCommand');
  });

  it('dispatches to an explicitly mapped handler class', async () => {
    class GreetCommand {
      constructor(public name: string) {}
    }

    class GreetHandler {
      handle(command: GreetCommand): string {
        return `Hello, ${command.name}!`;
      }
    }

    Bus.map(GreetCommand, GreetHandler);
    const result = await Bus.dispatch(new GreetCommand('World'));
    expect(result).toBe('Hello, World!');
  });

  it('register() is an alias for map()', async () => {
    class EchoCommand {
      constructor(public text: string) {}
    }

    Bus.register(EchoCommand, (cmd: EchoCommand) => cmd.text);
    const result = await Bus.dispatch(new EchoCommand('hi'));
    expect(result).toBe('hi');
    Bus.forget('EchoCommand');
  });

  it('dispatches to a function handler', async () => {
    class DoubleCommand {
      constructor(public value: number) {}
    }

    Bus.map(DoubleCommand, (cmd: DoubleCommand) => cmd.value * 2);
    const result = await Bus.dispatch(new DoubleCommand(21));
    expect(result).toBe(42);
  });

  it('handles self-handling commands', async () => {
    class PingCommand {
      constructor(public host: string) {}
      handle(): string {
        return `Pinging ${this.host}...`;
      }
    }

    const result = await Bus.dispatch(new PingCommand('example.com'));
    expect(result).toBe('Pinging example.com...');
  });

  it('throws when no handler is found', async () => {
    class OrphanCommand {
      constructor(public data: string) {}
    }

    await expect(Bus.dispatch(new OrphanCommand('test'))).rejects.toThrow(
      'No handler found',
    );
  });

  it('maps multiple handlers via maps()', async () => {
    class FooCmd {
      constructor(public v: string) {}
    }
    class BarCmd {
      constructor(public v: number) {}
    }

    Bus.maps({
      FooCmd: (cmd: FooCmd) => `foo:${cmd.v}`,
      BarCmd: (cmd: BarCmd) => cmd.v * 10,
    });

    expect(await Bus.dispatch(new FooCmd('x'))).toBe('foo:x');
    expect(await Bus.dispatch(new BarCmd(3))).toBe(30);
  });

  it('resolves handler from container via convention', async () => {
    class PingCommand {
      constructor(public target: string) {}
    }

    class PingHandler {
      handle(cmd: PingCommand): string {
        return `Pong: ${cmd.target}`;
      }
    }

    const container = new Container();
    container.instance('PingCommandHandler', new PingHandler());
    Bus.setContainer(container);

    const result = await Bus.dispatch(new PingCommand('localhost'));
    expect(result).toBe('Pong: localhost');
  });

  it('hasHandler returns correct status', async () => {
    class TestCmd {}
    expect(Bus.hasHandler('TestCmd')).toBe(false);

    Bus.map(TestCmd, () => 'ok');
    expect(Bus.hasHandler('TestCmd')).toBe(true);
  });

  it('forget removes a mapping', async () => {
    class TempCmd {}
    Bus.map(TempCmd, () => 'temp');
    expect(Bus.hasHandler('TempCmd')).toBe(true);
    Bus.forget('TempCmd');
    expect(Bus.hasHandler('TempCmd')).toBe(false);
  });
});

/* ──── Auto-discovery ────────────────────────────────────────────────── */

describe('Auto-discovery', () => {
  it(
    'discoverProviders() is safe on non-existent dirs',
    async () => {
      const { Application } = await import('../src/application.js');
      const app = new Application('/tmp/nonexistent-pondoknusa-project');
      await app.discoverProviders();
      // Should not throw — no providers dir to scan
    },
    15_000,
  );

  it('discoverCommands() returns empty for non-existent dirs', async () => {
    const { Application } = await import('../src/application.js');
    const app = new Application('/tmp/nonexistent-pondoknusa-project');
    const cmds = await app.discoverCommands();
    expect(cmds).toEqual([]);
  });
});
