# Collections

`@tyravel/collection` provides a fluent, type-safe, chainable collection — inspired by Laravel's `Collection`. Every method returns a new instance (immutable) unless noted.

```typescript
import { collect, Collection } from '@tyravel/collection';
```

## Creating collections

```typescript
// From an array
const users = collect([
  { id: 1, name: 'Ada', role: 'admin' },
  { id: 2, name: 'Grace', role: 'editor' },
  { id: 3, name: 'Alan', role: 'admin' },
]);

// Empty collection
const empty = collect<User>();

// From the Collection class
const items = new Collection([1, 2, 3]);
```

## Accessing items

```typescript
users.count();           // 3
users.isEmpty();         // false
users.isNotEmpty();      // true
users.first();           // { id: 1, name: 'Ada', role: 'admin' }
users.last();            // { id: 3, name: 'Alan', role: 'admin' }
users.nth(0);            // first item
users.nth(-1);           // last item
users.toArray();         // plain array copy
users.toJSON();          // JSON-serialized array
```

## Filtering

```typescript
users.filter(u => u.role === 'admin');
users.where(u => u.role === 'admin');            // alias for filter

users.whereEq('role', 'admin');                  // strict equality
users.whereIn('role', ['admin', 'editor']);      // IN
users.whereNotIn('role', ['guest']);             // NOT IN
users.whereNotNull('name');                      // not null/undefined
users.whereNull('deleted_at');                   // null/undefined

users.unique();                                  // remove duplicates
users.unique('name');                            // unique by key
```

## Mapping & reducing

```typescript
users.map(u => u.name);                          // Collection<string>
users.reduce((acc, u) => acc + u.name.length, 0);
users.each(u => console.log(u.name));            // side-effect, returns same collection
users.tap(c => console.log(c.count()));          // tap into chain
users.pipe(c => c.pluck('name').toArray());      // transform and return
```

## Sorting

```typescript
users.sortBy(u => u.name);                       // ascending
users.sortBy('name');                            // by key name
users.sortByDesc('name');                        // descending
users.sort((a, b) => a.name.localeCompare(b.name)); // custom comparator
users.reverse();
users.shuffle();
```

## Grouping

```typescript
users.groupBy('role');
// Collection<[string, User[]]> — e.g. [['admin', [Ada, Alan]], ['editor', [Grace]]]

users.keyBy('id');
// Collection<[string, User]> — e.g. [['1', Ada], ['2', Grace], ['3', Alan]]

users.partition(u => u.role === 'admin');
// [Collection<admin users>, Collection<non-admin users>]

users.chunk(2);
// Collection of arrays, each with up to 2 items

users.split(2);
// Split into 2 roughly equal groups
```

## Plucking

```typescript
users.pluck('name');                             // Collection<string>
users.values();                                  // identity, new copy
users.keys();                                    // keys of first item
```

## Aggregation

```typescript
collect([1, 2, 3, 4]).sum();                    // 10
collect([{ n: 1 }, { n: 2 }]).sum('n');         // 3
collect([1, 2, 3, 4]).avg();                    // 2.5
collect([1, 2, 3]).min();                       // 1
collect([1, 2, 3]).max();                       // 3
```

## Membership

```typescript
users.contains(adaUser);                         // strict equality
users.containsWhere(u => u.role === 'admin');    // predicate
users.every(u => u.id > 0);                     // all match
```

## String output

```typescript
collect(['a', 'b', 'c']).implode(',');           // "a,b,c"
collect(['a', 'b', 'c']).join(', ', ' and ');    // "a, b and c"
```

## Slicing & pagination

```typescript
collect([1, 2, 3, 4, 5]).skip(2);               // [3, 4, 5]
collect([1, 2, 3, 4, 5]).take(2);               // [1, 2]
collect([1, 2, 3, 4, 5]).take(-2);              // [4, 5]
collect([1, 2, 3, 4, 5, 6]).forPage(2, 3);      // [4, 5, 6]
collect([1, 2, 3, 4, 5]).slice(1, 3);           // [2, 3, 4]
```

## Mutation

```typescript
collect([1, 2]).push(3, 4);                      // [1, 2, 3, 4]
collect([1, 2]).prepend(0);                      // [0, 1, 2]
collect([1, 2, 3]).pop();                        // [1, 2]
collect([1, 2, 3]).shift();                      // [2, 3]
collect([1, 2, 3]).splice(1, 1, 99);            // [1, 99, 3]
```

## Combining

```typescript
collect([1, 2]).concat([3, 4]);                  // [1, 2, 3, 4]
collect([1, 2]).merge([3, 4]);                   // [1, 2, 3, 4]
collect([1, 2, 3]).diff([2, 3, 4]);              // [1]
collect([1, 2, 3]).intersect([2, 3, 4]);          // [2, 3]
```

## Conditionable

Use `when` and `unless` for conditional chains:

```typescript
collect([1, 2, 3, 4])
  .when(shouldFilter, c => c.filter(n => n > 2))
  .unless(shouldReverse, c => c.reverse());
```

## Random

```typescript
users.random();                                  // single random item
users.random(3);                                 // array of 3 random items
```

## `collect()` helper

The `collect()` function is also available from `@tyravel/support`:

```typescript
import { collect } from '@tyravel/support';
```