import { existsSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { start as startReplServer, type REPLServer } from 'node:repl';
import { homedir } from 'node:os';
import { listProjectRoutes } from './list-routes.js';
import type { Application } from '@pondoknusa/core';

const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

interface ReplContext {
  [key: string]: unknown;
}

/**
 * Start the Pondoknusa interactive shell.
 * Boots the application and provides a REPL with all facades and models available.
 */
export async function startRepl(projectRoot: string): Promise<number> {
  const context: ReplContext = {};

  // ── Boot the Pondoknusa application ──────────────────────────────────────
  const bootstrapPath = join(projectRoot, 'bootstrap', 'app.ts');
  const entryPath = join(projectRoot, 'src', 'main.ts');

  try {
    // Try loading the app bootstrap
    const bootstrap = await import(bootstrapPath);
    if (bootstrap.default || bootstrap.app) {
      const app = bootstrap.default || bootstrap.app;
      context.app = app;
    }
  } catch {
    // Fallback: try importing src/main.ts
    try {
      const entry = await import(entryPath);
      if (entry.app) context.app = entry.app;
      if (entry.default?.isBooted?.()) context.app = entry.default;
    } catch {
      // No app found — shell works without a booted app (limited mode)
    }
  }

  // ── Populate facades ─────────────────────────────────────────────────
  const facades: [string, string][] = [
    ['Route', '@pondoknusa/core'],
    ['DB', '@pondoknusa/core'],
    ['Auth', '@pondoknusa/core'],
    ['Cache', '@pondoknusa/core'],
    ['Queue', '@pondoknusa/core'],
    ['Events', '@pondoknusa/core'],
    ['Log', '@pondoknusa/core'],
    ['Mail', '@pondoknusa/core'],
    ['Notifications', '@pondoknusa/core'],
    ['Schedule', '@pondoknusa/core'],
    ['Storage', '@pondoknusa/core'],
    ['Config', '@pondoknusa/config'],
    ['collect', '@pondoknusa/support'],
  ];

  const req = createRequire(import.meta.url);
  for (const [name, pkg] of facades) {
    try {
      const mod = req(pkg) as Record<string, unknown>;
      if (mod[name]) {
        context[name] = mod[name];
      }
    } catch {
      // Package not available — skip
    }
  }

  // ── Load models from app/models/ ──────────────────────────────────────
  const modelDirectories = [
    join(projectRoot, 'src', 'models'),
    join(projectRoot, 'app', 'models'),
  ];

  for (const modelsDir of modelDirectories) {
    if (!existsSync(modelsDir)) {
      continue;
    }

    const modelFiles = readdirSync(modelsDir).filter(
      (file) => file.endsWith('.ts') && !file.endsWith('.test.ts'),
    );

    for (const file of modelFiles) {
      try {
        const modelPath = join(modelsDir, file);
        const mod = await import(modelPath);
        const modelName = file.replace(/\.ts$/, '');
        if (mod.default) {
          context[modelName] = mod.default;
        } else {
          const keys = Object.keys(mod);
          if (keys.length > 0 && keys[0]) {
            context[keys[0]] = mod[keys[0]];
          }
        }
      } catch {
        // Skip models that fail to load
      }
    }
  }

  const historyFile = join(homedir(), '.pondoknusa_shell_history');
  const bootedApp = context.app as Application | undefined;

  // ── Colorized greeting ───────────────────────────────────────────────
  console.log('');
  console.log(`  ${CYAN}⚡ Pondoknusa Shell${RESET}`);
  console.log(`  ${GREEN}Available:${RESET} Route, DB, Auth, Cache, Queue, Events, Log, Mail, Notifications, Schedule, Storage, collect`);
  if (Object.keys(context).length > 11) {
    const modelCount = Object.keys(context).length - 11 - (context.app ? 1 : 0);
    if (modelCount > 0) {
      console.log(`  ${GREEN}Models:${RESET} ${modelCount} loaded`);
    }
  }
  console.log(`  ${YELLOW}Tip:${RESET} Type .exit to quit, .routes / .models, or await User.find(1) for models`);
  console.log(`  ${YELLOW}History:${RESET} ${historyFile}`);
  console.log('');

  // ── Start REPL server ────────────────────────────────────────────────
  const server: REPLServer = startReplServer({
    prompt: `${CYAN}pondoknusa>${RESET} `,
    eval: evaluateInContext(context),
    preview: true,
    useColors: false,
  });

  // Setup persistent history
  server.setupHistory(historyFile, (err) => {
    if (err) {
      // Silent — history is a nice-to-have
    }
  });

  // ── Define REPL commands ─────────────────────────────────────────────
  server.defineCommand('models', {
    help: 'List all loaded models',
    action(this: REPLServer) {
      const modelKeys = Object.keys(context).filter(
        (k) => k !== 'app' && !['Route', 'DB', 'Auth', 'Cache', 'Queue', 'Events', 'Log', 'Mail', 'Notifications', 'Schedule', 'Storage', 'Config', 'collect'].includes(k),
      );
      if (modelKeys.length === 0) {
        console.log('No models loaded.');
      } else {
        console.log(`Models (${modelKeys.length}):`);
        for (const key of modelKeys) {
          console.log(`  ${GREEN}${key}${RESET}`);
        }
      }
      this.displayPrompt();
    },
  });

  server.defineCommand('routes', {
    help: 'List registered HTTP routes',
    action(this: REPLServer) {
      void listProjectRoutes(projectRoot, bootedApp)
        .then((routes) => {
          if (routes.length === 0) {
            console.log('No routes registered.');
            return;
          }

          console.log(`Routes (${routes.length}):`);
          for (const route of routes) {
            const name = route.name ? `  ${route.name}` : '';
            console.log(`${route.method.padEnd(7)} ${route.uri.padEnd(28)} ${route.action}${name}`);
          }
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          console.log(`Could not load routes: ${message}`);
        })
        .finally(() => {
          this.displayPrompt();
        });
    },
  });

  server.defineCommand('facades', {
    help: 'List all available facades',
    action(this: REPLServer) {
      console.log('Available facades and helpers:');
      const facadeList = ['Route', 'DB', 'Auth', 'Cache', 'Queue', 'Events', 'Log', 'Mail', 'Notifications', 'Schedule', 'Storage', 'Config', 'collect'];
      for (const name of facadeList) {
        const status = context[name] ? `${GREEN}✓${RESET}` : `${YELLOW}✗${RESET}`;
        console.log(`  ${status} ${name}`);
      }
      this.displayPrompt();
    },
  });

  // Autocomplete context keys
  server.on('reset', () => {
    // Re-populate context on reset
    for (const [key, value] of Object.entries(context)) {
      server.context[key] = value;
    }
  });

  // Populate initial context
  for (const [key, value] of Object.entries(context)) {
    server.context[key] = value;
  }

  return new Promise((resolvePromise) => {
    server.on('exit', () => {
      resolvePromise(0);
    });
  });
}

/**
 * Create a custom eval function that wraps the context.
 * Node's REPL natively supports top-level await since Node 22.
 */
function evaluateInContext(context: ReplContext) {
  return (
    code: string,
    _context: Record<string, unknown>,
    _filename: string,
    callback: (err: Error | null, result?: unknown) => void,
  ) => {
    // Build a function with the context keys as parameters
    const keys = Object.keys(context);
    const vals = keys.map((k) => context[k]);
    const asyncFn = code.includes('await') || code.includes('async');
    const prefix = asyncFn ? 'return (async () => {\n' : '';
    const suffix = asyncFn ? '\n})()' : '';

    try {
      const fn = new Function(...keys, `${prefix}${code}${suffix}`);
      const result = fn(...vals);

      if (result instanceof Promise) {
        result
          .then((val: unknown) => callback(null, val))
          .catch((err: Error) => callback(err));
      } else {
        callback(null, result);
      }
    } catch (err) {
      callback(err instanceof Error ? err : new Error(String(err)));
    }
  };
}
