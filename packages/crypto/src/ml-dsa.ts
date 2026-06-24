import { generateDsaKeyPair, resolveDsaBackend, signMessage, verifyMessage } from './backend.js';
import type { CryptoBackend, DsaAlgorithm, DsaKeyPair } from './types.js';

export class MlDsa {
  constructor(
    readonly algorithm: DsaAlgorithm,
    private readonly preferNative = true,
  ) {}

  generateKeyPair(seed?: Uint8Array): DsaKeyPair {
    return generateDsaKeyPair(this.algorithm, seed, { preferNative: this.preferNative }) as DsaKeyPair;
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

export function isMlDsaAlgorithm(algorithm: string): algorithm is DsaAlgorithm {
  return algorithm === 'ml-dsa-44' || algorithm === 'ml-dsa-65' || algorithm === 'ml-dsa-87';
}