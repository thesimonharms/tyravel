# Upgrading to 2.0

Pondoknusa **2.0.0** is a **rename** of Tyravel — same codebase, new package scope, CLI, config file, and branding. There are no intentional API breaks beyond the identifier changes listed below.

See the [v2.0.0 release notes](https://github.com/pondoknusa/pondoknusa/releases/tag/v2.0.0) and [changelog](https://github.com/pondoknusa/pondoknusa/blob/main/CHANGELOG.md).

## Package and tooling renames

| Before (Tyravel) | After (Pondoknusa) |
|------------------|-------------------|
| `@tyravel/core` | `@pondoknusa/core` |
| `tyravel` CLI | `pondoknusa` CLI |
| `tyravel.json` | `pondoknusa.json` |
| `TYRAVEL_*` env vars | `PONDOKNUSA_*` |
| `thesimonharms/tyravel` | `pondoknusa/pondoknusa` |
| `npm create tyravel@latest` | `npm create pondoknusa@latest` |

npm does **not** allow renaming packages. Legacy `@tyravel/*` installs show a deprecation notice pointing to `@pondoknusa/*`.

## Migration checklist

1. **Bump dependencies** — replace every `@tyravel/*` import and `package.json` entry with `@pondoknusa/*` at `^2.0.0`.
2. **Rename config** — `tyravel.json` → `pondoknusa.json`; update `package.json` scripts that invoke the CLI.
3. **Rename env vars** — e.g. `TYRAVEL_PORT` → `PONDOKNUSA_PORT`, `TYRAVEL_HOST` → `PONDOKNUSA_HOST`.
4. **Global CLI** — uninstall `tyravel` if installed globally; use `pondoknusa` (or `npx pondoknusa`).
5. **Search the codebase** — `rg '@tyravel|tyravel\.json|TYRAVEL_'` should return nothing when done.
6. **Run tests** — `npm test` (or your app’s test suite) after the find-and-replace pass.

### Example `package.json` diff

```diff
- "@tyravel/core": "^1.0.3"
+ "@pondoknusa/core": "^2.0.0"
```

### What stays the same

- **`.tyr` templates** — file extension and Blade-like syntax are unchanged.
- **API token prefix** — still `tyr_<secret>` (historical format; not tied to the project name).
- **Stable APIs** — semver policy from 1.0 still applies; see [API stability](/guide/api-stability).

## New projects

Scaffold fresh apps with:

```bash
npm create pondoknusa@latest my-app
```

## Still on 0.x?

If you are upgrading from **0.11–0.16** to 1.0 first, complete [Upgrading to 1.0](/guide/upgrading-to-1.0) before applying the 2.0 rename.