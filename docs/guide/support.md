# Support utilities

`@pondoknusa/support` provides string helpers, global functions, Pipeline, Macroable, and Conditionable — all modeled after Laravel's `Illuminate\Support` namespace.

## Str helpers

```typescript
import { Str, slug, camelCase } from '@pondoknusa/support';

slug('  My Post Title!  ');              // "my-post-title"
camelCase('hello_world');                // "helloWorld"
snakeCase('FooBar');                     // "foo_bar"
studlyCase('foo-bar');                   // "FooBar"
kebabCase('FooBarBaz');                  // "foo-bar-baz"
title('hello world');                    // "Hello World"
lower('HELLO');                          // "hello"
upper('hello');                          // "HELLO"
random(32);                              // alphanumeric token, e.g. "a1B9x..."
```

The `Str` object groups them all:

```typescript
Str.slug('Hello World');                 // "hello-world"
Str.camel('foo_bar');                    // "fooBar"
Str.snake('FooBar');                     // "foo_bar"
Str.studly('foo-bar');                   // "FooBar"
Str.kebab('FooBarBaz');                  // "foo-bar-baz"
Str.title('hello world');               // "Hello World"
Str.lower('HELLO');                     // "hello"
Str.upper('hello');                     // "HELLO"
Str.random(16);                         // "X7kL9m..."
```

## Stringable

Fluent string chaining:

```typescript
import { Stringable } from '@pondoknusa/support';

Stringable.of('  hello world  ')
  .slug()
  .title()
  .toString();
// => "Hello-World"

Stringable.of('HelloWorld')
  .kebab()
  .prepend('pondoknusa-')
  .toString();
// => "pondoknusa-hello-world"
```

### Content detection

```typescript
Stringable.of('hello').contains('ell');    // true
Stringable.of('hello').startsWith('he');   // true
Stringable.of('hello').endsWith('lo');     // true
Stringable.of('hello').exactly('hello');   // true
Stringable.of('post-42').is('post-*');     // true (wildcard)
Stringable.of('hello').length();           // 5
```

### Truncation

```typescript
Stringable.of('Hello World').limit(5);        // "Hello..."
Stringable.of('Hello World').limit(5, '…');   // "Hello…"
Stringable.of('one two three').words(2);      // "one two..."
```

### Transformation

```typescript
Stringable.of('world').prepend('hello ');     // "hello world"
Stringable.of('hello').append(' world');      // "hello world"
Stringable.of('hello@example.com').after('@'); // "example.com"
Stringable.of('hello@example.com').before('@'); // "hello"
Stringable.of('hello').upper();               // "HELLO"
Stringable.of('HELLO').lower();               // "hello"
Stringable.of('hello').ucfirst();             // "Hello"
Stringable.of('Hello').lcfirst();             // "hello"
```

### Replacement & padding

```typescript
Stringable.of('foo bar baz').replace('bar', 'baz');  // "foo baz baz"
Stringable.of('foo bar').replaceFirst('bar', 'baz'); // "foo baz"
Stringable.of('foo bar bar').replaceLast('bar', 'baz'); // "foo bar baz"
Stringable.of('hello').padBoth(10, '-');        // "--hello---"
Stringable.of('hello').padLeft(8, '-');         // "---hello"
Stringable.of('hello').padRight(8, '-');        // "hello---"
Stringable.of('  hello  ').trim();              // "hello"
```

### Regex

```typescript
Stringable.of('user_42').match(/\d+/);          // Stringable("42")
Stringable.of('a1b2').matchAll(/\d/);           // ["1", "2"]
Stringable.of('hello').test(/^he/);             // true
```

### Conditionable

```typescript
Stringable.of('hello')
  .when(shouldShout, s => s.upper())
  .whenEmpty(s => s.append('world'))
  .toString();
```

## Pipeline

Send data through a series of pipes:

```typescript
import { Pipeline } from '@pondoknusa/support';

const result = Pipeline
  .send(request)
  .through([TrimStrings, ConvertEmptyStringsToNull, HandleCors])
  .then((req) => controller.handle(req));
```

Each pipe is either a function `(passable, next) => next(passable)` or an object with a `handle` method:

```typescript
// Function pipe
const TrimStrings = (passable, next) => {
  passable.body = passable.body.trim();
  return next(passable);
};

// Class pipe
class HandleCors {
  handle(passable, next) {
    const response = next(passable);
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
  }
}
```

Customize the method name with `.via()`:

```typescript
Pipeline
  .send(data)
  .through(pipes)
  .via('process')
  .then((data) => result);
```

Use `.thenReturn()` when the destination is the identity function:

```typescript
const processed = Pipeline.send(input).through(pipes).thenReturn();
```

## Macroable

Add methods to classes at runtime:

```typescript
import { Macroable } from '@pondoknusa/support';

class MyClass extends Macroable {}

MyClass.macro('greet', (name: string) => `Hello ${name}`);
MyClass.callStatic('greet', 'World');
// => "Hello World"
```

Instance-level macros use `this`:

```typescript
MyClass.macro('shout', function (this: MyClass, msg: string) {
  return msg.toUpperCase();
});

const inst = new MyClass();
(inst as any).shout('hello'); // "HELLO"
```

Batch-register multiple macros with `mixin`:

```typescript
MyClass.mixin({
  hello: () => 'hi',
  bye: () => 'later',
});
```

Check and flush:

```typescript
MyClass.hasMacro('greet');   // true
MyClass.flushMacros();       // clear all
```

## Conditionable

Conditional chain helpers are available on `Collection`, `Stringable`, `QueryBuilder`, and `Pipeline`:

```typescript
// when(condition, callback, fallback?)
collection.when(filterByRole, c => c.whereEq('role', 'admin'));
queryBuilder.when(searchTerm, q => q.where('name', 'like', `%${searchTerm}%`));

// unless(condition, callback, fallback?)
stringable.unless(shouldTrim, s => s.trim());
```

## Global helpers

These are also available from `@pondoknusa/support`:

### Time

```typescript
import { now, today } from '@pondoknusa/support';

now();          // new Date()
today();        // "2025-06-21"
```

### Collection

```typescript
import { collect } from '@pondoknusa/support';

collect([1, 2, 3]).map(n => n * 2);
```

### Error handling

```typescript
import { rescue, retry, report } from '@pondoknusa/support';

rescue(() => riskyOperation(), fallbackValue);  // try, return fallback on error
await retry(3, () => fetchData(), 200);         // retry 3× with 200ms delay
report(error);                                  // console.error
```

### Conditionals

```typescript
import { throw_if, throw_unless } from '@pondoknusa/support';

throw_if(!user, new Error('User not found'));
throw_unless(user, new Error('User not found'));
```

### Value manipulation

```typescript
import { value, withValue, transform, optional } from '@pondoknusa/support';

value('hello');               // "hello"
value(() => 'computed');      // "computed" (calls it)

withValue(user, u => log(u));

transform(null, u => u.name, 'Guest');        // "Guest"
transform(user, u => u.name, 'Guest');         // user.name

optional(user);                                // user
optional(user, 'name');                        // user.name
optional(null, 'name');                        // undefined
```

### Array helpers

```typescript
import { head, last } from '@pondoknusa/support';

head([1, 2, 3]);              // 1
last([1, 2, 3]);              // 3
```

### Debug

```typescript
import { dd, dump } from '@pondoknusa/support';

dump(value);                  // console.log + continue
dd(valu1, value2);            // console.log + exit
```

### Path resolution

```typescript
import {
  base_path, app_path, config_path,
  database_path, storage_path,
  public_path, resource_path,
} from '@pondoknusa/support';

base_path();                  // project root (cwd)
app_path('models/User.ts');   // app/models/User.ts
config_path('app.ts');        // config/app.ts
database_path('migrations');  // database/migrations
storage_path('app');          // storage/app
public_path('css/app.css');   // public/css/app.css
resource_path('views');       // resources/views
```

### Reflection

```typescript
import { class_basename } from '@pondoknusa/support';

class_basename(User);                    // "User"
class_basename(new User());              // "User"
```