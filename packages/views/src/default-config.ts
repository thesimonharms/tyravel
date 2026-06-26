import type { ViewConfig } from './types.js';

const environment = process.env.NODE_ENV ?? 'production';
const isProduction = environment === 'production';

export const DEFAULT_VIEW_CONFIG: ViewConfig = {
  path: 'resources/views',
  extension: '.tyr',
  programmaticExtension: '.tyr.ts',
  compiled: isProduction,
  compiledPath: 'storage/framework/views',
  env: environment,
  requireCompiledCache: isProduction,
  validateProps: true,
};