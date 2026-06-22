import { describe, expect, it } from 'vitest';
import { Application } from './application.js';
import { ServiceProvider } from './service-provider.js';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('ServiceProvider contract', () => {
  it('awaits async register() for each provider in registration order', async () => {
    const order: string[] = [];

    class FirstProvider extends ServiceProvider {
      override async register() {
        await delay(5);
        order.push('first-register');
        this.app.instance('from-first', true);
      }
    }

    class SecondProvider extends ServiceProvider {
      override register() {
        order.push('second-register');
        expect(this.app.make<boolean>('from-first')).toBe(true);
      }
    }

    const app = new Application();
    app.register(FirstProvider);
    app.register(SecondProvider);
    await app.boot();

    expect(order.slice(0, 2)).toEqual(['first-register', 'second-register']);
  });

  it('runs all register() hooks before any boot() hook', async () => {
    const order: string[] = [];

    class ProviderA extends ServiceProvider {
      override register() {
        order.push('a-register');
      }

      override boot() {
        order.push('a-boot');
      }
    }

    class ProviderB extends ServiceProvider {
      override register() {
        order.push('b-register');
      }

      override boot() {
        order.push('b-boot');
      }
    }

    const app = new Application();
    app.register(ProviderA);
    app.register(ProviderB);
    await app.boot();

    expect(order).toEqual(['a-register', 'b-register', 'a-boot', 'b-boot']);
  });

  it('awaits async boot() for each provider in registration order', async () => {
    const order: string[] = [];

    class SlowBootProvider extends ServiceProvider {
      override async boot() {
        await delay(5);
        order.push('slow-boot');
      }
    }

    class FastBootProvider extends ServiceProvider {
      override boot() {
        order.push('fast-boot');
      }
    }

    const app = new Application();
    app.register(SlowBootProvider);
    app.register(FastBootProvider);
    await app.boot();

    expect(order).toEqual(['slow-boot', 'fast-boot']);
  });
});