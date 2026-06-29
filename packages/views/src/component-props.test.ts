import { describe, expect, it } from 'vitest';
import {
  generateViewPropsDeclarationFile,
  parsePropsSchema,
  validateViewProps,
  ViewPropsValidationError,
} from './component-props.js';

describe('component props', () => {
  it('parses required and optional props from @props defaults', () => {
    expect(parsePropsSchema({ title: undefined, count: 0 })).toEqual([
      { name: 'title', required: true, defaultValue: undefined, tsType: 'unknown' },
      { name: 'count', required: false, defaultValue: 0, tsType: 'number' },
    ]);
  });

  it('validates required props at render time', () => {
    expect(() =>
      validateViewProps({ title: undefined }, { title: 'Hello' }, 'welcome'),
    ).not.toThrow();

    expect(() => validateViewProps({ title: undefined }, {}, 'welcome')).toThrow(
      ViewPropsValidationError,
    );
  });

  it('generates module augmentation for view:types', () => {
    const output = generateViewPropsDeclarationFile({
      welcome: { name: undefined },
      dashboard: { count: 0 },
    });

    expect(output).toContain("declare module '@pondoknusa/views'");
    expect(output).toContain('"welcome": {');
    expect(output).toContain('"name": unknown;');
    expect(output).toContain('"count"?: number;');
  });
});