# Tier 5 — Magic DX (v0.5.0)

> **Goal:** Recreate the magic of Laravel in a way that feels TypeScript native, with developer and execution speed.
>
> **Constraint:** No docs site work yet — too much is still shifting. Everything here is in-code DX.
>
> **Architecture:** Split into two concentric rings: `@pondoknusa/support` (zero-dependency, framework-agnostic: Collection, Stringable, Pipeline, helpers) and framework integration (Macroable applied to core classes, `tinker` booting the app, auto-discovery via the Application/Container).

---

## The 10 items for Tier 5, priority-ordered

### Legend

| Icon | Meaning |
|------|---------|
| 🪄 | Zero-dep package — `@pondoknusa/support` or new package |
| ⚡ | Framework integration — ties into Application, CLI, etc. |
| 🌱 | New package (`@pondoknusa/collection`) |

---

### P0 — Ship in v0.5.0 no matter what

#### ✅ Task 1: Collection (`@pondoknusa/collection`) [P0 — 🌱]

A fluent, chainable, type-safe `Collection<T>` class with lazy evaluation.

**Directory:** `packages/collection/`

**Minimum viable surface (Laravel‑classic):**

```
collect([1, 2, 3])
  .map(fn) → Collection
  .filter(fn) → Collection
  .reduce(fn, initial) → T
  .each(fn) → Collection
  .first(fn?) → T | undefined
  .firstWhere(key, op?, val) → T | undefined
  .last(fn?) → T | undefined
  .where(key, op?, val) → Collection
  .whereIn(key, arr) → Collection
  .whereNotIn(key, arr) → Collection
  .pluck(key) → Collection
  .keyBy(key) → Collection<Record<string, T>>
  .groupBy(key | fn) → Collection<Record<string, T[]>>
  .sortBy(key | fn) → Collection
  .unique(key?) → Collection
  .chunk(size) → Collection<T[]>
  .collapse() → Collection
  .flatten(depth?) → Collection
  .tap(fn) → Collection
  .pipe(fn) → U
  .when(pred, fn) → Collection
  .unless(pred, fn) → Collection
  .contains(keyOrFn, val?) → boolean
  .isEmpty() → boolean
  .isNotEmpty() → boolean
  .count() → number
  .sum(key?) → number
  .avg(key?) → number
  .min(key?) → T
  .max(key?) → T
  .values() → Collection
  .keys() → Collection<keyof T>
  .toArray() → T[]
  .toJSON() → T[]
  .implode(glue) → string
  .join(glue, lastGlue?) → string
  .random(count?) → T | T[]
  .shuffle() → Collection
  .reverse() → Collection
  .slice(offset, length?) → Collection
  .splice(offset, count, ...replacements) → Collection
  .push(value) → Collection
  .pop() → T | undefined
  .shift() → T | undefined
  .unshift(value) → Collection
  .splice(offset, count, ...replacement) → Collection
  .concat(...collections) → Collection
  .merge(collection) → Collection
  .diff(collection) → Collection
  .intersect(collection) → Collection
  .union(collection) → Collection
  .only(keys) → Collection
  .except(keys) → Collection
  .forPage(page, perPage) → Collection
  .split(count) → Collection<T[]>
  .partition(fn) → [Collection, Collection]
  [Symbol.iterator]()
```

**Files to create:**
- `packages/collection/package.json`
- `packages/collection/tsconfig.json`
- `packages/collection/src/index.ts`
- `packages/collection/src/collection.ts`
- `packages/collection/src/higher-order-message.ts` (for `->each->doSomething` style)
- `packages/collection/test/collection.test.ts`

**The `collect()` helper** lives in `@pondoknusa/support` and re-exports from `@pondoknusa/collection`.

**Higher‑order messaging bonus:** `$items->each->methodName(args)` — requires Proxy‑based lazy method binding. Nice‑to‑have for P0, defer if complex.

---

#### ✅ Task 2: `pondoknusa shell` (REPL) [P0 — ⚡]

An interactive TypeScript REPL that boots the Pondoknusa application and drops you into a prompt.

**Implementation path:**

1. **`@pondoknusa/repl` package** (or live in `cli`):
   - Uses Node.js built-in `node:repl` module
   - Boots the app (imports `bootstrap/app.ts` or the app kernel)
   - Provides a `context` object with all facades pre-imported: `Route`, `DB`, `Auth`, `Cache`, `Queue`, `Events`, `Log`, `Mail`, `Notifications`, `Schedule`, `Storage`
   - Provides `Model` classes from the app (scans `app/models/`)
   - Auto-`await` support via `replServer.eval` wrapper
   - Colorized prompt
   - `.exit`, `.help`, `.clear` commands

2. **`pondoknusa shell` CLI command** in `packages/cli/src/commands/shell.ts`
   - Called via the standard CLI kernel
   - Requires `@pondoknusa/repl`

**Key files:**
- Create: `packages/repl/package.json`
- Create: `packages/repl/src/index.ts`
- Create: `packages/repl/src/repl.ts`
- Create: `packages/cli/src/commands/shell.ts` (thin wrapper)

**Example session:**

```
$ pondoknusa shell
Pondoknusa > User.query().find(1)
→ { id: 1, name: 'Ada', email: 'ada@example.com', created_at: 2026-06-21 }

Pondoknusa > collect([1,2,3]).map(x => x * 2).toArray()
→ [2, 4, 6]
```

---

#### ✅ Task 3: Global Helpers (`@pondoknusa/support`) [P0 — 🪄]

Add Laravel-inspired global helpers to `@pondoknusa/support`. These are exported functions that users `import` at the top of their files — no `globalThis` pollution.

**Files to modify:** `packages/support/src/`
- Create: `packages/support/src/helpers.ts`
- Modify: `packages/support/src/index.ts` (re-export)

**Helper surface:**

| Helper | What it does |
|--------|-------------|
| `now()` | `new Date()` |
| `today()` | `new Date().toISOString().slice(0,10)` |
| `collect(arr)` | `new Collection(arr)` (from `@pondoknusa/collection`) |
| `report(err)` | Log error through the app's Log facade (or `console.error` if no app) |
| `rescue(fn, fallback?)` | Try `fn()`, return fallback or re-throw |
| `retry(times, fn, delay?)` | Retry `fn` up to `times` with delay |
| `throw_if(condition, exception)` | `if (condition) throw exception` |
| `throw_unless(condition, exception)` | `if (!condition) throw exception` |
| `transform(value, fn, fallback?)` | Apply fn if value is not null/undefined, else fallback |
| `with(value, fn)` | Pass value to fn, return value (side-effect chain) |
| `value(valueOrFn)` | Return value or call it if it's a function |
| `optional(obj, key?)` | Null-safe property access (`obj?.key`) |
| `head(arr)` | `arr[0]` |
| `last(arr)` | `arr[arr.length - 1]` |
| `class_basename(objOrClass)` | Last segment of class/constructor name |
| `trait_uses_recursive(trait)` | Reflection helper (if needed in TS context) |
| `dd(...args)` | Dump and die — print + throw |
| `dump(...args)` | Print + continue |
| `base_path(path?)` | Path relative to project root |
| `app_path(path?)` | Path relative to `app/` |
| `config_path(path?)` | Path relative to `config/` |
| `database_path(path?)` | Path relative to `database/` |
| `storage_path(path?)` | Path relative to `storage/` |
| `public_path(path?)` | Path relative to `public/` |
| `resource_path(path?)` | Path relative to `resources/` |

**Type-safety note:** Path helpers return `string`. The `dd()` helper conflicts with debugger UX — consider making it a no-op in production or configurable.

---

### P1 — Ship in v0.5.0 if time permits

#### ✅ Task 4: Stringable (fluent string builder) [P1 — 🪄]

`Str::of('hello world')->slug()->title()->toString()`

Adds a fluent wrapper around the existing `Str` static methods.

**Files to modify:** `packages/support/src/str.ts`
- Add: `Stringable` class
- Modify: `packages/support/src/index.ts`

**API:**

```typescript
class Stringable {
  constructor(private value: string) {}

  after(search: string): Stringable
  afterLast(search: string): Stringable
  append(...values: string[]): Stringable
  before(search: string): Stringable
  camel(): Stringable
  contains(substr: string): boolean
  endsWith(search: string): boolean
  exactly(other: string): boolean
  finish(cap: string): Stringable  // ensure ends with
  is(pattern: string): boolean     // wildcard match
  kebab(): Stringable
  lcfirst(): Stringable
  length(): number
  limit(limit: number, end?: string): Stringable
  lower(): Stringable
  ltrim(char?: string): Stringable
  match(pattern: RegExp): Stringable
  padBoth(length: number, pad?: string): Stringable
  padLeft(length: number, pad?: string): Stringable
  padRight(length: number, pad?: string): Stringable
  prepend(...values: string[]): Stringable
  replace(search: string, replace: string): Stringable
  replaceArray(search: string, replace: string[]): Stringable
  replaceFirst(search: string, replace: string): Stringable
  replaceLast(search: string, replace: string): Stringable
  rtrim(char?: string): Stringable
  shuffle(): Stringable
  slug(separator?: string): Stringable
  snake(): Stringable
  split(pattern: string | RegExp): string[]
  start(prefix: string): Stringable  // ensure starts with
  startsWith(search: string): boolean
  studly(): Stringable
  substr(start: number, length?: number): Stringable
  title(): Stringable
  trim(char?: string): Stringable
  ucfirst(): Stringable
  upper(): Stringable
  when(predicate: boolean | ((s: Stringable) => boolean), fn: (s: Stringable) => Stringable): Stringable
  whenEmpty(fn: (s: Stringable) => Stringable): Stringable
  words(words: number, end?: string): Stringable
  toString(): string
  valueOf(): string
  [Symbol.toPrimitive](hint: string): string | number
}
```

`Str::of(str)` returns a `Stringable` instance.

---

#### ✅ Task 5: Pipeline [P1 — 🪄]

A general-purpose Pipeline that sends data through a series of pipes. Based on Laravel's `Illuminate\Pipeline\Pipeline`.

**Package:** `@pondoknusa/support` (or standalone `@pondoknusa/pipeline` if it makes sense)

**API:**

```typescript
class Pipeline<TInput = unknown, TOutput = unknown> {
  send(passable: TInput): this
  through(pipes: Array<Pipe<TInput, TOutput>>): this
  via(method: string): this  // which method to call on each pipe (default: 'handle')
  then(destination: (passable: TInput) => TOutput): TOutput
  thenReturn(): TOutput  // calls then with identity
}
```

Where `Pipe` is:

```typescript
type Pipe<TInput, TOutput> =
  | ((passable: TInput, next: (passable: TInput) => TOutput) => TOutput)
  | { handle(passable: TInput, next: (passable: TInput) => TOutput): TOutput }
```

**Usage:**

```typescript
const result = await Pipeline
  .send(request)
  .through([
    TrimStrings,
    HandleCors,
    EnsureFrontendRequestsAreStateful,
  ])
  .via('handle')
  .then((req) => controller.handle(req))
```

Also useful for form request validation, data transformation pipelines, and middleware stacks outside the HTTP kernel.

---

#### ✅ Task 6: Macroable (runtime class extension) [P1 — 🪄]

A mixin that lets users add methods to core framework classes at runtime.

**Package:** `@pondoknusa/support`

**Implementation:**

```typescript
type MacroMap = Record<string, Function>;

class Macroable {
  static macros: MacroMap = {};

  static macro(name: string, fn: Function): void {
    this.macros[name] = fn;
  }

  static mixin(methods: MacroMap): void {
    Object.assign(this.macros, methods);
  }

  static hasMacro(name: string): boolean {
    return name in this.macros;
  }
}
```

Applied via a class decorator or mixin function:

```typescript
function applyMacroable(target: Function): void {
  target.prototype.__call = function (name: string, args: unknown[]) {
    const macros = (target.constructor as typeof Macroable).macros;
    if (name in macros) {
      return macros[name](...args);
    }
    throw new Error(`Method ${name} not found`);
  };
}
```

**Which classes to macro-ify (framework integration):**
- `Request` — add custom request helpers
- `Response` — add `response()->jsonApi()`, etc.
- `Collection` — extend with domain-specific methods
- `ModelQueryBuilder` — add custom query scopes at runtime
- `Router` — route macros

**Note:** This needs careful Proxy-based dynamic dispatch to work with TypeScript typing ergonomically.

---

#### ✅ Task 7: Conditionable (when/unless trait) [P1 — 🪄]

A reusable `when()` / `unless()` mixin that can be applied to any class.

**Package:** `@pondoknusa/support`

```typescript
class Conditionable {
  when<TThis>(
    value: boolean | (() => boolean),
    callback: (this: TThis, instance: TThis) => TThis,
    default?: (this: TThis, instance: TThis) => TThis,
  ): TThis

  unless<TThis>(
    value: boolean | (() => boolean),
    callback: (this: TThis, instance: TThis) => TThis,
    default?: (this: TThis, instance: TThis) => TThis,
  ): TThis
}
```

Applied to: `Collection`, `ModelQueryBuilder`, `Pipeline`, `Request`.

---

### P2 — Ship if v0.5.0 scope allows

#### ✅ Task 8: Auto-discovery [P2 — ⚡]

Convention-based registration of service providers and commands.

**How it works:**
- Scan `app/providers/` at boot for files exporting a class extending `ServiceProvider`
- Scan `app/console/` or `app/commands/` for `make:` style commands
- Register all discovered providers/commands automatically

**Implementation in `packages/core/src/application.ts`:**
- Add `discoverProviders()` and `discoverCommands()` methods
- Glob scan in the project root directory
- Cache the discovered list (read `.pondoknusa-discovery.json`)

**Key considerations:**
- Needs to know the project root — use `find-up` or check for `bootstrap/app.ts`
- Cache to avoid re-scanning on every request in dev
- Users can disable via `config/app.ts`.

---

#### ✅ Task 9: Interactive CLI prompts [P2 — ⚡]

Make `pondoknusa new` interactive with prompts for meaningful choices.

**Changes to `packages/cli/src/commands/new.ts`:**
- Prompt for database driver (SQLite / MySQL / PostgreSQL)
- Prompt for cache driver (file / redis / array)
- Prompt for queue driver (database / redis / sync)
- Prompt for auth (yes/no + guard type)
- Prompt for mail driver (log / SMTP / array)
- Progress bar during `npm install`
- Summary at end showing selected stack

**Implementation:**
- Use Node.js built-in `readline` or `@inquirer/prompts` (lightweight)
- Each choice generates the correct config stubs
- Store selections in meta-comment at top of `package.json` or `.pondoknusa.json`

---

#### ✅ Task 10: Command Bus (Bus facade) [P2 — ⚡]

A lightweight command bus for dispatching commands to handlers, auto-resolved from the container.

**Package:** `packages/bus/` or fits in `packages/core/`

**API:**

```typescript
// Define a command
class SendWelcomeEmail {
  constructor(public user: User) {}
}

// Define its handler
class SendWelcomeEmailHandler {
  async handle(command: SendWelcomeEmail): Promise<void> {
    // send the email
  }
}

// Dispatch (resolves handler from container)
await Bus.dispatch(new SendWelcomeEmail(user));

// Self-handling commands (Laravel's self-handling pattern)
class PingServer {
  async handle(): Promise<ServerResponse> { ... }
}
await Bus.dispatch(new PingServer());
```

**Key details:**
- Handler resolution: `command.constructor.name.replace('Command', 'Handler')` → attempt container resolution
- Or explicit: `Bus.map({ SendWelcomeEmail: SendWelcomeEmailHandler })`
- Supports queued commands: `Bus.dispatch(new HeavyJob()).onQueue('high')`

---

## Summary table

| # | Feature | Package | Type | Effort | Why it's magical |
|---|---------|---------|------|--------|-----------------|
| 1 | Collection | `@pondoknusa/collection` | 🌱 | Medium | `collect()` is the #1 Laravel DX moment |
| 2 | `pondoknusa shell` | `@pondoknusa/repl` | ⚡ | Medium | Interactive repl with full app context |
| 3 | Global helpers | `@pondoknusa/support` | 🪄 | Small | `now()`, `throw_if()`, `collect()` — reads like Laravel |
| 4 | Stringable | `@pondoknusa/support` | 🪄 | Small | `Str::of($s)->slug()->title()` |
| 5 | Pipeline | `@pondoknusa/support` | 🪄 | Small | Clean data-through-pipes pattern |
| 6 | Macroable | `@pondoknusa/support` | 🪄 | Medium | Extend core classes at runtime |
| 7 | Conditionable | `@pondoknusa/support` | 🪄 | Small | `query.when(...)` reads naturally |
| 8 | Auto-discovery | `@pondoknusa/core` | ⚡ | Medium | Convention over configuration |
| 9 | Interactive CLI | `@pondoknusa/cli` | ⚡ | Medium | `pondoknusa new` with smart prompts |
| 10 | Command Bus | `@pondoknusa/bus` or core | ⚡ | Medium | `Bus.dispatch(new Thing())` |

---

## Files likely to change

### New packages
- `packages/collection/` (everything)
- `packages/repl/` (everything)

### Modified packages
- `packages/support/src/` (helpers, Str → Stringable, Conditionable, Macroable, Pipeline)
- `packages/support/package.json` (add `@pondoknusa/collection` dependency)
- `packages/core/src/index.ts` (re-export new support items)
- `packages/cli/src/commands/new.ts` (interactive prompts)
- `packages/cli/src/kernel.ts` (register tinker command)
- `packages/core/src/application.ts` (auto-discovery, bus registration)
- `packages/database/src/model-query-builder.ts` (Conditionable mixin)
- `packages/http/src/request.ts` (Macroable + Conditionable)
- `packages/http/src/response.ts` (Macroable)

### Root
- `package.json` (add workspace references)

---

## Testing strategy

| Feature | Test approach |
|---------|--------------|
| Collection | Unit tests for every method, edge cases, type safety |
| Stringable | Unit tests chaining every method |
| Pipeline | Unit tests with function pipes, class pipes, via() |
| Macroable | Unit tests for macro registration, dispatch, error cases |
| Conditionable | Unit tests with when/unless/default |
| Helpers | Unit tests for each helper |
| Tinker | Integration test — spawn REPL, send commands, read output |
| Auto-discovery | Integration — create temp project, verify providers loaded |
| CLI prompts | Integration — pipe answers to stdin, assert output |
| Command Bus | Unit tests for handler resolution, queued dispatch |

---

## Risks and open questions

1. **Shell auto-await** — Node's REPL supports top-level await natively in `replServer.eval`? Need to verify REPL async wrapping.
2. **Macroable + TypeScript** — Runtime method injection is inherently un-typeable. Users will need type assertions or module augmentation. Acceptable?
3. **Auto-discovery performance** — Glob scan on every boot vs cache invalidation strategy. Use mtime-based cache.
4. **`dd()` in production** — Should be a no-op. Needs config gate.
5. **Collection bundle size** — With 50+ methods, tree-shaking may not help if importing `collect()`. Consider ESM-only or subpath exports.
6. **`pondoknusa new` dependency on `@inquirer/prompts`** — Adds a dependency. Alternative: use raw `readline` for zero deps.
