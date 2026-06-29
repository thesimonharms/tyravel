import { join } from 'node:path';
import type { ChildProcess } from 'node:child_process';
import { isHeadlessProject } from './headless-project.js';
import { loadProjectConfig } from './project.js';
import { ensureLocalTlsCerts } from './local-tls.js';
import {
  describeRuntimeIssue,
  detectTypeScriptRuntime,
  printRuntimeInfo,
  spawnTypeScriptEntry,
} from './runtime.js';
import { spawnPondoknusaCommand } from './spawn-cli.js';
import { optionNumber, optionString, pathExists } from './utils.js';

export interface DevServerOptions {
  root: string;
  cliArgs: string[];
  options: Record<string, string | boolean>;
}

export async function startDevServer({
  root,
  options,
}: DevServerOptions): Promise<{ code: number; children: ChildProcess[] }> {
  const config = await loadProjectConfig(root);
  const headless = config.mode === 'headless' || (await isHeadlessProject(root));
  const entry = join(root, config.entry);
  const runtime = detectTypeScriptRuntime();

  if (!runtime) {
    console.error(describeRuntimeIssue());
    return { code: 1, children: [] };
  }

  const port = optionNumber(options, 'port', config.serve.port);
  const hostname = optionString(options, 'host', config.serve.hostname) ?? config.serve.hostname;
  const children: ChildProcess[] = [];
  const withTls = options.tls === true;
  const withQueue = options['no-queue'] !== true;
  const debugInstalled = await pathExists(join(root, 'config/debug.ts'));
  const withWatch = options['no-watch'] !== true && debugInstalled;

  let scheme = 'http';
  const serverEnv: NodeJS.ProcessEnv = {
    ...process.env,
    PONDOKNUSA_PORT: String(port),
    PONDOKNUSA_HOST: hostname,
    PONDOKNUSA_HOT_RELOAD: '1',
  };

  if (!headless) {
    serverEnv.PONDOKNUSA_VIEW_WATCH = '1';
  }

  if (withTls) {
    try {
      const { certPath, keyPath } = await ensureLocalTlsCerts(root);
      serverEnv.PONDOKNUSA_TLS_CERT = certPath;
      serverEnv.PONDOKNUSA_TLS_KEY = keyPath;
      scheme = 'https';
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      return { code: 1, children: [] };
    }
  }

  const displayHost = hostname === '0.0.0.0' ? '127.0.0.1' : hostname;

  console.log('Starting Pondoknusa development server...');
  printRuntimeInfo(runtime);
  console.log(`URL: ${scheme}://${displayHost}:${port}`);
  if (withTls) {
    console.log(`TLS certs: storage/framework/tls/localhost.crt`);
  }
  console.log('');

  const spawned: string[] = [];

  if (withQueue) {
    const worker = spawnPondoknusaCommand(root, ['queue:work']);
    children.push(worker);
    spawned.push('queue worker');
  }

  if (withWatch) {
    const watcher = spawnPondoknusaCommand(root, ['debug:watch', '--correlations']);
    children.push(watcher);
    spawned.push('debug:watch');
  }

  if (spawned.length > 0) {
    console.log(`Concurrent dev: ${spawned.join(', ')} (one Ctrl+C shuts down all)`);
    console.log('');
  } else {
    console.log('Dev tips:');
    if (headless) {
      console.log('  • Config and routes hot-reload in this process');
      console.log('  • Run `pondoknusa debug:install` then `pondoknusa dev` to tail API debug entries');
    } else {
      console.log('  • Views, config, and routes hot-reload in this process');
      console.log('  • Run `pondoknusa debug:install` then `pondoknusa dev` to tail debug entries');
    }
    console.log('  • Use `--no-queue` or `--no-watch` to disable background workers');
    console.log('');
  }

  const server = spawnTypeScriptEntry({
    entry,
    cwd: root,
    env: serverEnv,
  });
  children.push(server);

  const shutdown = (): void => {
    for (const child of children) {
      if (!child.killed) {
        child.kill('SIGTERM');
      }
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  const code = await new Promise<number>((resolve) => {
    server.on('exit', (exitCode) => {
      process.off('SIGINT', shutdown);
      process.off('SIGTERM', shutdown);
      shutdown();
      resolve(exitCode ?? 1);
    });
    server.on('error', (error) => {
      console.error(error.message);
      resolve(1);
    });
  });

  return { code, children };
}