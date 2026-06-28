import type { HttpConfig } from '@tyravel/core';

export default {
  trustedProxies: ['127.0.0.1', '::1'],
  jsonFastPath: true,
  early404: true,
  throttle: {
    enabled: true,
    limit: 120,
    windowMs: 60_000,
    limits: {
      api: { limit: 120, windowMs: 60_000 },
    },
  },
} satisfies HttpConfig;
