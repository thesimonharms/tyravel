# Reference

Machine-readable API surface for Pondoknusa **1.0.x**. Use this section when you need package names, CLI commands, facade entry points, or exported symbols — not narrative guides.

## What's here

| Section | Purpose |
|---------|---------|
| [All packages](/reference/generated/packages) | Every `@pondoknusa/*` package with install instructions and public exports |
| [CLI commands](/reference/generated/cli) | Full `pondoknusa` command list with usage strings |
| [Facades](/reference/generated/facades) | Static facades and links to guide chapters |

## Regenerating

Reference pages are generated from the monorepo:

```bash
npm run docs:generate
```

Outputs land in `docs/reference/generated/` and update the VitePress sidebar. Run this after adding packages or CLI commands.

## Stability

Not every export is production-stable. Check [API stability](/guide/api-stability) and [STABILITY.md](https://github.com/pondoknusa/pondoknusa/blob/main/STABILITY.md) before building on experimental APIs.

## Agents & tooling

`docs/.vitepress/generated/manifest.json` indexes packages, commands, and facades for MCP and IDE integrations (`pondoknusa mcp:serve`, `pondoknusa mcp:export-rules`).