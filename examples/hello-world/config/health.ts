import type { HealthConfig } from '@pondoknusa/core';

export default {
  enabled: true,
  path: '/health',
  livenessPath: '/health/live',
  readinessPath: '/health/ready',
  checks: {
    database: true,
    redis: true,
  },
} satisfies HealthConfig;