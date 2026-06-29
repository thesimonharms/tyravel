export default {
  enabled: true,
  path: '/__debug',
  injectBar: true,
  maxEntries: 50,
  persist: true,
  persistPath: '.pondoknusa/debug-entries.json',
  correlationsPath: '.pondoknusa/debug-correlations.json',
  slowQueryMs: 100,
  nPlusOneThreshold: 3,
  otel: {
    enabled: false,
    endpoint: 'http://127.0.0.1:4318/v1/traces',
    serviceName: 'pondoknusa',
  },
} as const;