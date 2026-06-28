import { describe, expect, it } from 'vitest';
import { compile } from './compiler.js';
import {
  evaluateStaticBoolean,
  foldTemplateOps,
} from './conditional-folding.js';

describe('evaluateStaticBoolean', () => {
  it('evaluates literal booleans and negation', () => {
    expect(evaluateStaticBoolean('true')).toBe(true);
    expect(evaluateStaticBoolean('false')).toBe(false);
    expect(evaluateStaticBoolean('!false')).toBe(true);
    expect(evaluateStaticBoolean('true && false')).toBe(false);
    expect(evaluateStaticBoolean('false || true')).toBe(true);
    expect(evaluateStaticBoolean('1 === 1')).toBe(true);
  });

  it('returns undefined for dynamic expressions', () => {
    expect(evaluateStaticBoolean('show')).toBeUndefined();
    expect(evaluateStaticBoolean('user.active')).toBeUndefined();
  });
});

describe('compile-time conditional folding', () => {
  it('folds @if (true) into body ops', () => {
    const template = compile(`@if (true)
  <p>Yes</p>
@else
  <p>No</p>
@endif`);

    expect(template.ops).toEqual([{ type: 'text', value: '  <p>Yes</p>\n' }]);
  });

  it('folds @if (false) into else body', () => {
    const template = compile(`@if (false)
  <p>Yes</p>
@else
  <p>No</p>
@endif`);

    expect(template.ops).toEqual([{ type: 'text', value: '  <p>No</p>\n' }]);
  });

  it('folds @unless (false) into body ops', () => {
    const template = compile(`@unless (false)
  <p>Shown</p>
@endunless`);

    expect(template.ops).toEqual([{ type: 'text', value: '  <p>Shown</p>\n' }]);
  });

  it('folds @production and @local for a known environment', () => {
    const template = compile(
      `@production
  <p>Prod</p>
@endproduction
@local
  <p>Dev</p>
@endlocal`,
      { environment: 'production' },
    );

    expect(template.ops).toEqual([{ type: 'text', value: '  <p>Prod</p>\n' }]);
  });

  it('folds @env when the compile environment matches', () => {
    const template = compile(
      `@env('production', 'staging')
  <p>Live</p>
@endenv`,
      { environment: 'staging' },
    );

    expect(template.ops).toEqual([{ type: 'text', value: '  <p>Live</p>\n' }]);
  });

  it('leaves dynamic @if expressions for runtime evaluation', () => {
    const template = compile(`@if (show)
  <p>Yes</p>
@endif`);

    expect(template.ops).toEqual([
      {
        type: 'if',
        expression: 'show',
        body: [{ type: 'text', value: '  <p>Yes</p>\n' }],
      },
    ]);
  });

  it('folds nested static branches inside preserved dynamic branches', () => {
    const folded = foldTemplateOps(
      [
        {
          type: 'if',
          expression: 'show',
          body: [
            { type: 'if', expression: 'true', body: [{ type: 'text', value: 'kept' }] },
          ],
        },
      ],
      {},
    );

    expect(folded).toEqual([
      {
        type: 'if',
        expression: 'show',
        body: [{ type: 'text', value: 'kept' }],
      },
    ]);
  });
});