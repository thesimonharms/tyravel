import { describe, expect, it } from 'vitest';
import {
  parseRouteSegments,
  RoutePrefixTrie,
  splitPathname,
} from './route-prefix-trie.js';

describe('parseRouteSegments', () => {
  it('parses literal and param segments', () => {
    expect(parseRouteSegments('/api/v1/users/:id')).toEqual([
      { kind: 'literal', value: 'api' },
      { kind: 'literal', value: 'v1' },
      { kind: 'literal', value: 'users' },
      { kind: 'param', name: 'id' },
    ]);
  });

  it('returns an empty segment list for root patterns', () => {
    expect(parseRouteSegments('/')).toEqual([]);
  });
});

describe('RoutePrefixTrie', () => {
  it('matches a single parameterized route', () => {
    const trie = new RoutePrefixTrie<string>();
    trie.add('users.show', parseRouteSegments('/users/:id'));

    expect(trie.match('/users/42')).toEqual([
      { route: 'users.show', params: { id: '42' } },
    ]);
  });

  it('returns matches in registration order when patterns share a terminal', () => {
    const trie = new RoutePrefixTrie<string>();
    trie.add('first', parseRouteSegments('/items/:id'));
    trie.add('second', parseRouteSegments('/items/:slug'));

    expect(trie.match('/items/alpha').map((entry) => entry.route)).toEqual([
      'first',
      'second',
    ]);
  });

  it('prefers deeper literal branches over shorter param routes', () => {
    const trie = new RoutePrefixTrie<string>();
    trie.add('users.show', parseRouteSegments('/users/:id'));
    trie.add('users.posts', parseRouteSegments('/users/:id/posts'));

    expect(trie.match('/users/9/posts')).toEqual([
      { route: 'users.posts', params: { id: '9' } },
    ]);
    expect(trie.match('/users/9')).toEqual([
      { route: 'users.show', params: { id: '9' } },
    ]);
  });

  it('decodes URI-encoded parameter values', () => {
    const trie = new RoutePrefixTrie<string>();
    trie.add('search', parseRouteSegments('/search/:query'));

    expect(trie.match('/search/hello%20world')).toEqual([
      { route: 'search', params: { query: 'hello world' } },
    ]);
  });

  it('returns no matches for non-matching paths', () => {
    const trie = new RoutePrefixTrie<string>();
    trie.add('users.show', parseRouteSegments('/users/:id'));

    expect(trie.match('/posts/1')).toEqual([]);
    expect(trie.match('/users/1/extra')).toEqual([]);
  });
});

describe('splitPathname', () => {
  it('splits normalized pathnames into segments', () => {
    expect(splitPathname('/api/v1/health')).toEqual(['api', 'v1', 'health']);
    expect(splitPathname('/')).toEqual([]);
  });
});