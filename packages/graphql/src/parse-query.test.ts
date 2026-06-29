import { describe, expect, it } from 'vitest';
import { GraphQLParseError } from './errors.js';
import { parseQuery, resolveArgumentValues } from './parse-query.js';

describe('parseQuery', () => {
  it('parses anonymous query shorthand', () => {
    const parsed = parseQuery('{ hello version }');
    expect(parsed.type).toBe('query');
    expect(parsed.name).toBeUndefined();
    expect(parsed.selectionSet.fields.map((field) => field.name)).toEqual(['hello', 'version']);
  });

  it('parses named queries with variables and aliases', () => {
    const parsed = parseQuery(`
      query GetHello($name: String) {
        greeting: hello(name: $name)
        version
      }
    `);

    expect(parsed.type).toBe('query');
    expect(parsed.name).toBe('GetHello');
    expect(parsed.variableDefinitions).toEqual({ name: 'String' });
    expect(parsed.selectionSet.fields[0]).toMatchObject({
      name: 'hello',
      alias: 'greeting',
      args: { name: { $var: 'name' } },
    });
  });

  it('parses nested selection sets and inline objects', () => {
    const parsed = parseQuery(`
      {
        user {
          id
          profile { bio }
        }
      }
    `);

    expect(parsed.selectionSet.fields[0]?.name).toBe('user');
    expect(parsed.selectionSet.fields[0]?.selectionSet?.fields.map((field) => field.name))
      .toEqual(['id', 'profile']);
    expect(parsed.selectionSet.fields[0]?.selectionSet?.fields[1]?.selectionSet?.fields[0]?.name)
      .toBe('bio');
  });

  it('rejects empty documents', () => {
    expect(() => parseQuery('   ')).toThrow(GraphQLParseError);
  });
});

describe('resolveArgumentValues', () => {
  it('resolves variable references', () => {
    const resolved = resolveArgumentValues(
      { name: { $var: 'name' }, limit: 5 },
      { name: 'Pondoknusa' },
    );

    expect(resolved).toEqual({ name: 'Pondoknusa', limit: 5 });
  });
});