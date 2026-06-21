import { describe, expect, it } from 'vitest';
import { flattenTranslations, translate } from './locale.js';

describe('locale', () => {
  it('flattens nested translation trees', () => {
    expect(
      flattenTranslations({
        messages: {
          welcome: 'Hello :name',
        },
      }),
    ).toEqual({
      'messages.welcome': 'Hello :name',
    });
  });

  it('replaces placeholders in translated strings', () => {
    expect(
      translate(
        'messages.welcome',
        { 'messages.welcome': 'Hello :name' },
        { name: 'Ada' },
      ),
    ).toBe('Hello Ada');
  });
});