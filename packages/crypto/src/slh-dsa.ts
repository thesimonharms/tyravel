import { generateSlhDsaKeyPair, resolveDsaBackend, signMessage, verifyMessage } from './backend.js';
import type { CryptoBackend, DsaKeyPair, SlhDsaAlgorithm } from './types.js';

export class SlhDsa {
  constructor(
    readonly algorithm: SlhDsaAlgorithm,
    private readonly preferNative = true,
  ) {}

  generateKeyPair(seed?: Uint8Array): DsaKeyPair {
    return generateSlhDsaKeyPair(this.algorithm, seed, {
      preferNative: this.preferNative,
    }) as DsaKeyPair;
  }

  sign(message: Uint8Array, secretKey: Uint8Array, backend?: CryptoBackend): Uint8Array {
    const resolved = backend ?? resolveDsaBackend(this.algorithm, { preferNative: this.preferNative });
    return signMessage(this.algorithm, message, secretKey, resolved);
  }

  verify(
    signature: Uint8Array,
    message: Uint8Array,
    publicKey: Uint8Array,
    backend?: CryptoBackend,
  ): boolean {
    const resolved = backend ?? resolveDsaBackend(this.algorithm, { preferNative: this.preferNative });
    return verifyMessage(this.algorithm, signature, message, publicKey, resolved);
  }
}

export function isSlhDsaAlgorithm(algorithm: string): algorithm is SlhDsaAlgorithm {
  return algorithm.startsWith('slh-dsa-');
}