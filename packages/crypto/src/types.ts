export type KemAlgorithm = 'ml-kem-512' | 'ml-kem-768' | 'ml-kem-1024';

export type DsaAlgorithm = 'ml-dsa-44' | 'ml-dsa-65' | 'ml-dsa-87';

export type SlhDsaAlgorithm =
  | 'slh-dsa-sha2-128f'
  | 'slh-dsa-sha2-128s'
  | 'slh-dsa-sha2-192f'
  | 'slh-dsa-sha2-192s'
  | 'slh-dsa-sha2-256f'
  | 'slh-dsa-sha2-256s';

export type HybridAlgorithm = 'hybrid-x25519-ml-kem-768';

export type CryptoAlgorithm = KemAlgorithm | DsaAlgorithm | SlhDsaAlgorithm | HybridAlgorithm;

export type CryptoBackend = 'native' | 'noble';

export interface KeyMaterial {
  algorithm: CryptoAlgorithm;
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export interface SerializedKeyMaterial {
  algorithm: CryptoAlgorithm;
  publicKey: string;
  secretKey: string;
}

export interface KemKeyPair extends KeyMaterial {
  algorithm: KemAlgorithm | HybridAlgorithm;
}

export interface DsaKeyPair extends KeyMaterial {
  algorithm: DsaAlgorithm | SlhDsaAlgorithm;
}

export interface EncapsulationResult {
  ciphertext: Uint8Array;
  sharedSecret: Uint8Array;
}

export interface EncryptedEnvelope {
  version: 1;
  algorithm: KemAlgorithm | HybridAlgorithm;
  backend: CryptoBackend;
  kemCiphertext: Uint8Array;
  iv: Uint8Array;
  ciphertext: Uint8Array;
  tag: Uint8Array;
}

export interface CryptoSessionConfig {
  encrypt?: boolean;
  key?: string;
  fallbackKey?: string;
}

export interface CryptoOAuthConfig {
  signTokens?: boolean;
  algorithm?: DsaAlgorithm | SlhDsaAlgorithm;
  publicKey?: string;
  secretKey?: string;
}

export interface CryptoConfig {
  kem?: KemAlgorithm | HybridAlgorithm;
  signature?: DsaAlgorithm | SlhDsaAlgorithm;
  preferNative?: boolean;
  session?: CryptoSessionConfig;
  oauth?: CryptoOAuthConfig;
}

export const DEFAULT_CRYPTO_CONFIG: Required<
  Pick<CryptoConfig, 'kem' | 'signature' | 'preferNative'>
> = {
  kem: 'hybrid-x25519-ml-kem-768',
  signature: 'ml-dsa-65',
  preferNative: true,
};