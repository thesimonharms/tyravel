import type { HttpConfig } from '@pondoknusa/core';

export default {
  trustedProxies: ['127.0.0.1', '::1'],
  throttle: {
    enabled: true,
    limit: 60,
    windowMs: 60_000,
  },
} satisfies HttpConfig;