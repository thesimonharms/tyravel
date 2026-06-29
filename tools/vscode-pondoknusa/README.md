# Pondoknusa VS Code / Cursor extension (stub)

Syntax highlighting and snippets for `.tyr` templates. This is a starter pack — install locally while a full language server is planned (Tier 18 P2).

## Install locally

```bash
cd tools/vscode-pondoknusa
code --install-extension .
# or in Cursor: Extensions → Install from VSIX after `npm run package`
```

## Language server

For go-to-definition and `@include` completion, use the basic LSP in `tools/tyr-lsp/`.

## Typed props

Run `pondoknusa view:types` in your app to generate `types/view-props.generated.d.ts`. Export the component catalog for tooling:

```bash
pondoknusa view:catalog --ide=vscode > .pondoknusa/view-catalog.json
```

## Snippets

| Prefix | Inserts |
|--------|---------|
| `tyr-layout` | `@layout` + `@section` block |
| `tyr-component` | `@component` with props |
| `tyr-props` | `@props({ ... })` for `view:types` |