import { connect } from 'node:net';
import type { RedisSentinelConfig } from '@pondoknusa/redis';

export async function resolveSentinelMasterUrl(config: RedisSentinelConfig): Promise<string> {
  for (const sentinel of config.sentinels) {
    try {
      const response = await querySentinel(
        sentinel.host,
        sentinel.port ?? 26379,
        `SENTINEL get-master-addr-by-name ${config.name}`,
      );
      const lines = response.split('\r\n').filter(Boolean);
      const host = lines[1];
      const port = lines[2];
      if (host && port) {
        return `redis://${host}:${port}`;
      }
    } catch {
      continue;
    }
  }

  throw new Error(`Unable to resolve Redis master [${config.name}] from configured sentinels.`);
}

function querySentinel(host: string, port: number, command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = connect({ host, port });
    const chunks: Buffer[] = [];

    socket.on('data', (chunk: Buffer) => chunks.push(chunk));
    socket.on('error', reject);
    socket.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    socket.on('connect', () => {
      socket.write(`${command}\r\n`);
      socket.end();
    });
  });
}