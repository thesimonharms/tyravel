import { describe, expect, it } from 'vitest';
import { evaluateExpression } from './evaluate.js';

describe('evaluateExpression', () => {
  it('reads simple dotted paths without compiling a Function', () => {
    const context = {
      title: 'Hello',
      user: { name: 'Ada' },
    };

    expect(evaluateExpression('title', context)).toBe('Hello');
    expect(evaluateExpression('user.name', context)).toBe('Ada');
  });

  it('still evaluates complex expressions', () => {
    expect(evaluateExpression('items.length + 1', { items: [1, 2, 3] })).toBe(4);
  });
});