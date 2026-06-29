import type { LogConfig } from '@pondoknusa/log';
import { env } from '@pondoknusa/config';

export default {
  default: env('LOG_CHANNEL', 'stack'),
  channels: {
    stdout: { channel: 'stdout' },
    file: {
      channel: 'file',
      path: 'storage/logs/pondoknusa.log',
    },
    stack: {
      channel: 'stack',
      channels: ['stdout', 'file'],
    },
  },
} satisfies LogConfig;
