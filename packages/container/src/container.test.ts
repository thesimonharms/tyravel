import { describe, expect, it } from 'vitest';
import { BindingResolutionException, Container } from './container.js';

describe('Container', () => {
  it('resolves a transient binding', () => {
    const container = new Container();
    let count = 0;

    container.bind('counter', () => ({ value: ++count }));

    const first = container.make<{ value: number }>('counter');
    const second = container.make<{ value: number }>('counter');

    expect(first.value).toBe(1);
    expect(second.value).toBe(2);
  });

  it('resolves a singleton binding once', () => {
    const container = new Container();
    let count = 0;

    container.singleton('counter', () => ({ value: ++count }));

    const first = container.make<{ value: number }>('counter');
    const second = container.make<{ value: number }>('counter');

    expect(first).toBe(second);
    expect(first.value).toBe(1);
  });

  it('registers a pre-built instance', () => {
    const container = new Container();
    const config = { appName: 'Pondoknusa' };

    container.instance('config', config);

    expect(container.make('config')).toBe(config);
  });

  it('resolves aliases', () => {
    const container = new Container();
    container.instance('app.config', { debug: true });
    container.alias('app.config', 'config');

    expect(container.make<{ debug: boolean }>('config').debug).toBe(true);
  });

  it('instantiates concrete classes', () => {
    class PingService {
      pong() {
        return 'pong';
      }
    }

    const container = new Container();
    const service = container.make(PingService);

    expect(service.pong()).toBe('pong');
  });

  it('resolves classes through explicit bindings', () => {
    class Database {
      query() {
        return 'ok';
      }
    }

    class UserRepository {
      constructor(public readonly database: Database) {}
    }

    const container = new Container();
    container.bind(UserRepository, (app) => new UserRepository(app.make(Database)));

    const repository = container.make(UserRepository);

    expect(repository.database.query()).toBe('ok');
  });

  it('throws when a binding is missing', () => {
    const container = new Container();

    expect(() => container.make('missing')).toThrow(BindingResolutionException);
  });

  it('injects named parameters into callables', () => {
    const container = new Container();
    container.instance('name', 'Pondoknusa');

    const greeting = container.call((name: string) => `Hello, ${name}!`, {
      name: container.make<string>('name'),
    });

    expect(greeting).toBe('Hello, Pondoknusa!');
  });
});