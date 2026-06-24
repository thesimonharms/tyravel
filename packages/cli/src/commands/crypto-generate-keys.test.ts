import { describe, expect, it } from 'vitest';
import { CryptoGenerateKeysCommand } from './crypto-generate-keys.js';

describe('CryptoGenerateKeysCommand', () => {
  it('generates hybrid keys as JSON', async () => {
    const command = new CryptoGenerateKeysCommand();
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (value: string) => {
      logs.push(value);
    };

    try {
      const exitCode = await command.handle(['--algorithm=ml-kem-768']);
      expect(exitCode).toBe(0);
      const payload = JSON.parse(logs.join('\n')) as {
        algorithm: string;
        publicKey: string;
        secretKey: string;
      };
      expect(payload.algorithm).toBe('ml-kem-768');
      expect(payload.publicKey.length).toBeGreaterThan(0);
      expect(payload.secretKey.length).toBeGreaterThan(0);
    } finally {
      console.log = originalLog;
    }
  });

  it('rejects unknown algorithms', async () => {
    const command = new CryptoGenerateKeysCommand();
    const exitCode = await command.handle(['--algorithm=unknown']);
    expect(exitCode).toBe(1);
  });
});