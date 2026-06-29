import { QueryProfiler } from '@pondoknusa/database';
import type { LogManager } from '@pondoknusa/log';
import type { Middleware } from '@pondoknusa/http';
import { buildDebugEntry } from './collector.js';
import { DebugRequestContext, runWithDebugContext } from './context.js';
import { injectDebugBar } from './debug-bar.js';
import { exportDebugSpan } from './otel-exporter.js';
import { captureRequestSnapshot } from './request-snapshot.js';
import type { DebugStore } from './store.js';
import type { DebugConfig } from './types.js';

export interface DebugMiddlewareOptions {
  enabled: boolean;
  config: DebugConfig;
  store: DebugStore;
  log?: LogManager;
  recordEntries?: boolean;
}

export function createDebugMiddleware(options: DebugMiddlewareOptions): Middleware {
  const config = options.config;

  return async (request, next) => {
    if (!options.enabled) {
      return next();
    }

    const context = new DebugRequestContext(request.method, request.url.pathname);
    context.record('http', `${request.method} ${request.url.pathname}`);
    const requestSnapshot = await captureRequestSnapshot(request);

    return runWithDebugContext(context, async () => {
      QueryProfiler.enable();
      QueryProfiler.reset();

      const start = performance.now();
      const response = await next();
      const durationMs = performance.now() - start;
      const queries = QueryProfiler.getQueries();
      QueryProfiler.disable();

      const entry = buildDebugEntry(
        context,
        response.status,
        durationMs,
        queries,
        config,
        requestSnapshot,
      );
      if (options.recordEntries !== false) {
        options.store.push(entry);
      }

      if (config.otel?.enabled && config.otel.endpoint) {
        void exportDebugSpan(entry, {
          endpoint: config.otel.endpoint,
          serviceName: config.otel.serviceName,
          headers: config.otel.headers,
        }).catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          if (options.log) {
            options.log.channel().warn('OTEL export failed', { message });
          } else {
            console.warn('[pondoknusa:debug:otel]', message);
          }
        });
      }

      if (entry.warnings.length > 0) {
        const payload = {
          path: entry.path,
          warnings: entry.warnings,
        };
        if (options.log) {
          options.log.channel().warn('Debug warnings detected', payload);
        } else {
          console.warn('[pondoknusa:debug]', payload);
        }
      }

      if (config.injectBar !== false) {
        return injectDebugBar(response, entry, config.path ?? '/__debug');
      }

      return response;
    });
  };
}