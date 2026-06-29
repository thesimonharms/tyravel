# Pondoknusa `.tyr` language server (basic)

Stdio LSP for Pondoknusa templates. Provides:

- Completion for `@include`, `@component`, and `@layout` view paths
- Prop name completion from `types/view-props.generated.d.ts` (run `pondoknusa view:types` first)
- Go-to-definition for referenced view paths

## Install

```bash
cd tools/tyr-lsp
npm install
```

## VS Code / Cursor

Add to `.vscode/settings.json` in your Pondoknusa app:

```json
{
  "pondoknusa.languageServerPath": "../pondoknusa/tools/tyr-lsp/server.mjs"
}
```

Or configure the [Pondoknusa extension stub](../vscode-pondoknusa/README.md) and point your editor's LSP client at:

```bash
node /path/to/pondoknusa/tools/tyr-lsp/server.mjs
```

## Scope

This is a Tier 18 starter LSP — not a full Blade-class language server. It validates `@include` paths by filesystem lookup and reads generated `ViewPropsMap` types for completions.