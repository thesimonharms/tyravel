import { resolveDsaBackend, signMessage, verifyMessage } from './backend.js';
import { fromBase64, toBase64, toUtf8Bytes } from './encoding.js';
import type { CryptoBackend, DsaAlgorithm, SlhDsaAlgorithm } from './types.js';

export interface SignedTokenPayload {
  v: 1;
  id: number;
  exp: number;
  [key: string]: unknown;
}

export interface SignedTokenOptions {
  algorithm: DsaAlgorithm | SlhDsaAlgorithm;
  publicKey: Uint8Array;
  secretKey: Uint8Array;
  preferNative?: boolean;
}

export class SignedTokenService {
  private readonly backend: CryptoBackend;

  constructor(private readonly options: SignedTokenOptions) {
    this.backend = resolveDsaBackend(options.algorithm, {
      preferNative: options.preferNative,
    });
  }

  sign(payload: SignedTokenPayload, prefix = ''): string {
    const body = toBase64(toUtf8Bytes(JSON.stringify(payload)));
    const signature = signMessage(
      this.options.algorithm,
      toUtf8Bytes(body),
      this.options.secretKey,
      this.backend,
    );
    return `${prefix}${body}.${toBase64(signature)}`;
  }

  verify(token: string, prefix = ''): SignedTokenPayload | null {
    const raw = token.startsWith(prefix) ? token.slice(prefix.length) : token;
    const separator = raw.lastIndexOf('.');
    if (separator <= 0) {
      return null;
    }

    const body = raw.slice(0, separator);
    const signature = raw.slice(separator + 1);
    const valid = verifyMessage(
      this.options.algorithm,
      fromBase64(signature),
      toUtf8Bytes(body),
      this.options.publicKey,
      this.backend,
    );

    if (!valid) {
      return null;
    }

    try {
      const payload = JSON.parse(new TextDecoder().decode(fromBase64(body))) as SignedTokenPayload;
      if (payload.v !== 1 || typeof payload.id !== 'number' || typeof payload.exp !== 'number') {
        return null;
      }

      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  isSignedToken(token: string, prefix = ''): boolean {
    const raw = token.startsWith(prefix) ? token.slice(prefix.length) : token;
    return raw.includes('.');
  }
}

export function createSignedTokenServiceFromConfig(
  config: {
    algorithm?: DsaAlgorithm | SlhDsaAlgorithm;
    publicKey?: string;
    secretKey?: string;
    preferNative?: boolean;
  },
): SignedTokenService | null {
  if (!config.publicKey || !config.secretKey) {
    return null;
  }

  return new SignedTokenService({
    algorithm: config.algorithm ?? 'ml-dsa-65',
    publicKey: fromBase64(config.publicKey),
    secretKey: fromBase64(config.secretKey),
    preferNative: config.preferNative,
  });
}