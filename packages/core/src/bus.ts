import type { Container } from '@pondoknusa/container';

/**
 * A command handler: either a class with `handle(command)` or a function.
 */
export type CommandHandler<TCommand = unknown, TResult = unknown> =
  | (new (...args: unknown[]) => { handle(command: TCommand): TResult | Promise<TResult> })
  | ((command: TCommand) => TResult | Promise<TResult>);

type HandlerMap = Map<string, CommandHandler<any, any>>;

/**
 * Lightweight command bus — dispatch commands to auto-resolved handlers.
 *
 * Usage:
 *   Bus.setContainer(app); // set once at boot
 *   await Bus.dispatch(new SendWelcomeEmail(user));
 *
 * Explicit mapping:
 *   Bus.map(SendWelcomeEmail, SendWelcomeEmailHandler);
 *
 * Self-handling commands (command has handle()):
 *   class PingServer {
 *     async handle(): Promise<ServerResponse> { ... }
 *   }
 *   await Bus.dispatch(new PingServer());
 */
class CommandBus {
  private handlers: HandlerMap = new Map();
  private container: Container | null = null;

  /** Set the IoC container for handler resolution. */
  setContainer(container: Container): void {
    this.container = container;
  }

  /** Register an explicit command → handler mapping. */
  map<TCommand>(command: new (...args: unknown[]) => TCommand, handler: CommandHandler<TCommand>): this {
    this.handlers.set(command.name, handler);
    return this;
  }

  /** Alias for {@link map} — preferred stable name for explicit handler registration. */
  register<TCommand>(command: new (...args: unknown[]) => TCommand, handler: CommandHandler<TCommand>): this {
    return this.map(command, handler);
  }

  /** Map multiple handlers at once. */
  maps(mappings: Record<string, CommandHandler>): this {
    for (const [key, handler] of Object.entries(mappings)) {
      this.handlers.set(key, handler);
    }
    return this;
  }

  /** Dispatch a command to its handler. */
  async dispatch<TResult = void>(command: unknown): Promise<TResult> {
    const commandName = (command as object).constructor?.name;
    if (!commandName) {
      throw new Error('Command must have a named constructor.');
    }

    // 1. Check explicit mapping
    const explicitHandler = this.handlers.get(commandName);
    if (explicitHandler) {
      return this.resolveHandler(explicitHandler, command);
    }

    // 2. Check if command itself has a handle() method (self-handling)
    const cmd = command as { handle?: (...args: unknown[]) => unknown };
    if (typeof cmd.handle === 'function') {
      const result = cmd.handle();
      return result instanceof Promise ? (await result) as TResult : result as TResult;
    }

    // 3. Try convention: CommandName → CommandNameHandler from container
    const handlerName = `${commandName}Handler`;
    if (this.container) {
      try {
        const handler = this.container.make<{ handle: (cmd: unknown) => TResult }>(handlerName);
        if (handler && typeof handler.handle === 'function') {
          return handler.handle(command);
        }
      } catch {
        // Not bound in container
      }
    }

    throw new Error(
      `No handler found for command [${commandName}]. ` +
      'Register a handler via Bus.map(), implement handle() on the command, ' +
      'or bind the handler in the container.',
    );
  }

  /** Check if a command has a registered handler. */
  hasHandler(commandName: string): boolean {
    if (this.handlers.has(commandName)) return true;
    if (this.container) {
      try {
        this.container.make(`${commandName}Handler`);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  /** Remove a handler mapping. */
  forget(commandName: string): this {
    this.handlers.delete(commandName);
    return this;
  }

  private resolveHandler<TResult>(handler: CommandHandler, command: unknown): TResult | Promise<TResult> {
    if (typeof handler === 'function' && !/^class\s/.test(handler.toString())) {
      // It's a plain function
      return (handler as (cmd: unknown) => TResult | Promise<TResult>)(command);
    }

    // It's a class — instantiate
    const instance = new (handler as new (...args: unknown[]) => { handle: (cmd: unknown) => TResult })();
    const result = instance.handle(command);
    return result instanceof Promise ? result : result as TResult;
  }
}

/** Singleton Bus instance. */
export const Bus = new CommandBus();
