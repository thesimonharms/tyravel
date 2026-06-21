import { describe, expect, it } from 'vitest';
import { ConfigRepository } from './repository.js';

describe('ConfigRepository', () => {
  it('resolves dotted keys', () => {
    const config = new ConfigRepository({
      app: {
        name: 'Tyravel',
        debug: true,
      },
    });

    expect(config.get<string>('app.name')).toBe('Tyravel');
    expect(config.get<boolean>('app.debug')).toBe(true);
    expect(config.has('app.missing')).toBe(false);
  });

  it('sets and merges config values', () => {
    const config = new ConfigRepository({
      lontar: {
        perPage: 25,
        feed: { title: 'My Blog' },
      },
    });

    config.merge('lontar', {
      perPage: 15,
      feed: { title: 'Lontar', limit: 20 },
    });

    expect(config.get<number>('lontar.perPage')).toBe(25);
    expect(config.get<string>('lontar.feed.title')).toBe('My Blog');
    expect(config.get<number>('lontar.feed.limit')).toBe(20);

    config.set('lontar.feed.title', 'Updated');
    expect(config.get<string>('lontar.feed.title')).toBe('Updated');
  });
});