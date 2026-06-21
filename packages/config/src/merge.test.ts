import { describe, expect, it } from 'vitest';
import { mergeConfig } from './merge.js';

describe('mergeConfig', () => {
  it('fills in missing keys from defaults', () => {
    const merged = mergeConfig(
      {
        perPage: 15,
        feed: { title: 'Lontar', limit: 20 },
      },
      {
        perPage: 25,
      },
    );

    expect(merged).toEqual({
      perPage: 25,
      feed: { title: 'Lontar', limit: 20 },
    });
  });

  it('deep merges nested objects with app values winning', () => {
    const merged = mergeConfig(
      {
        feed: { title: 'Lontar', limit: 20 },
      },
      {
        feed: { title: 'My Blog' },
      },
    );

    expect(merged).toEqual({
      feed: { title: 'My Blog', limit: 20 },
    });
  });

  it('replaces arrays wholesale', () => {
    const merged = mergeConfig(
      { channels: ['rss', 'atom'] },
      { channels: ['atom'] },
    );

    expect(merged).toEqual({ channels: ['atom'] });
  });
});