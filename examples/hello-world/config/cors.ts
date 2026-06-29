import type { CorsConfig } from '@pondoknusa/core';

export default {
  enabled: true,
  origins: ['*'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  headers: ['Content-Type', 'Authorization'],
  credentials: false,
} satisfies CorsConfig;