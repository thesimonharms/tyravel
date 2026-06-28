import type { LogConfig } from '@tyravel/log';
import { env } from '@tyravel/config';

export default {
  default: env('LOG_CHANNEL', 'stack'),
  channels: {
    stdout: { channel: 'stdout' },
    file: {
      channel: 'file',
      path: 'storage/logs/tyravel.log',
    },
    stack: {
      channel: 'stack',
      channels: ['stdout', 'file'],
    },
  },
} satisfies LogConfig;
