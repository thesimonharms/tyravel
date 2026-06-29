#!/usr/bin/env node
import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  CompletionItemKind,
  TextDocumentSyncKind,
} from 'vscode-languageserver/node.js';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

connection.onInitialize((params) => {
  const root = params.workspaceFolders?.[0]?.uri
    ? fileURLToPath(params.workspaceFolders[0].uri)
    : process.cwd();

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        triggerCharacters: ['@', "'", '"', '/'],
      },
      definitionProvider: true,
    },
    serverInfo: {
      name: 'pondoknusa-tyr-lsp',
      version: '0.1.0',
    },
    workspaceRoot: root,
  };
});

let workspaceRoot = process.cwd();

connection.onInitialized((params) => {
  workspaceRoot = params.workspaceFolders?.[0]?.uri
    ? fileURLToPath(params.workspaceFolders[0].uri)
    : workspaceRoot;
});

async function listViewFiles(directory) {
  const entries = [];
  try {
    const files = await readdir(directory, { withFileTypes: true });
    for (const file of files) {
      const fullPath = join(directory, file.name);
      if (file.isDirectory()) {
        entries.push(...await listViewFiles(fullPath));
        continue;
      }
      if (file.name.endsWith('.tyr') || file.name.endsWith('.tyr.ts')) {
        entries.push(fullPath);
      }
    }
  } catch {
    return entries;
  }
  return entries;
}

function viewNameFromPath(path) {
  const viewsRoot = join(workspaceRoot, 'resources/views');
  const relativePath = relative(viewsRoot, path).replace(/\\/g, '/');
  return relativePath.replace(/\.tyr\.ts$/, '').replace(/\.tyr$/, '').replace(/\/index$/, '');
}

connection.onCompletion(async (params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  const line = document.getText({
    start: { line: params.position.line, character: 0 },
    end: params.position,
  });

  const viewsDir = join(workspaceRoot, 'resources/views');
  const viewFiles = await listViewFiles(viewsDir);
  const items = [];

  if (/@(include|component|layout)\(\s*['"]?[^'"]*$/.test(line)) {
    for (const file of viewFiles) {
      const label = viewNameFromPath(file);
      items.push({
        label,
        kind: CompletionItemKind.File,
        detail: 'Pondoknusa view',
        insertText: `'${label}'`,
      });
    }
  }

  if (/@props\s*\{/.test(line) || line.includes('@props')) {
    const propsPath = join(workspaceRoot, 'types/view-props.generated.d.ts');
    try {
      const contents = await readFile(propsPath, 'utf8');
      const matches = contents.matchAll(/^\s+([A-Za-z0-9_]+)\??:/gm);
      for (const match of matches) {
        if (match[1] && match[1] !== 'ViewPropsMap') {
          items.push({
            label: match[1],
            kind: CompletionItemKind.Property,
            detail: 'View prop',
          });
        }
      }
    } catch {
      items.push({
        label: 'Run pondoknusa view:types',
        kind: CompletionItemKind.Text,
        detail: 'Generate types/view-props.generated.d.ts first',
      });
    }
  }

  return items;
});

connection.onDefinition(async (params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const line = document.getText({
    start: { line: params.position.line, character: 0 },
    end: { line: params.position.line, character: Number.MAX_SAFE_INTEGER },
  });

  const match = line.match(/@(include|component|layout)\(\s*['"]([^'"]+)['"]/);
  if (!match) {
    return null;
  }

  const viewName = match[2];
  const candidates = [
    join(workspaceRoot, 'resources/views', `${viewName}.tyr`),
    join(workspaceRoot, 'resources/views', `${viewName}.tyr.ts`),
    join(workspaceRoot, 'resources/views', viewName, 'index.tyr'),
  ];

  for (const candidate of candidates) {
    try {
      await readFile(candidate);
      return { uri: candidate, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } } };
    } catch {
      continue;
    }
  }

  return null;
});

documents.listen(connection);
connection.listen();