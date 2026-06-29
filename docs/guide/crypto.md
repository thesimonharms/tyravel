# Post-quantum cryptography

Pondoknusa ships post-quantum primitives in `@pondoknusa/crypto`, with optional integration into session storage and the OAuth2 authorization server.

## Install

Scaffold configuration, then add the package:

```bash
pondoknusa crypto:install
npm install @pondoknusa/crypto
```

Generate key material with the CLI (no config file required):

```bash
pondoknusa crypto:generate-keys --algorithm=hybrid-x25519-ml-kem-768
pondoknusa crypto:generate-keys --algorithm=ml-dsa-65
```

## Configuration

Add `config/crypto.ts` to your application:

```typescript
import type { CryptoConfig } from '@pondoknusa/crypto';
import { env } from '@pondoknusa/config';

export default {
  kem: 'hybrid-x25519-ml-kem-768',
  signature: 'ml-dsa-65',
  session: {
    encrypt: env('SESSION_ENCRYPT', 'false') === 'true',
    key: env('SESSION_ENCRYPTION_KEY', ''),
    fallbackKey: env('APP_KEY', ''),
  },
  oauth: {
    signTokens: env('OAUTH_SIGN_TOKENS', 'false') === 'true',
    algorithm: 'ml-dsa-65',
    publicKey: env('OAUTH_TOKEN_PUBLIC_KEY', ''),
    secretKey: env('OAUTH_TOKEN_SECRET_KEY', ''),
  },
} satisfies CryptoConfig;
```

`AuthServiceProvider` reads `crypto.session` to encrypt database and Redis session payloads. `OAuthServerServiceProvider` reads `crypto.oauth` and enables ML-DSA signed access tokens when `signTokens` is `true`.

## Algorithms

| Family | Variants | Use |
|--------|----------|-----|
| **ML-KEM** | 512, 768, 1024 | Key encapsulation (encrypt shared secrets) |
| **ML-DSA** | 44, 65, 87 | Digital signatures |
| **SLH-DSA** | sha2-128f/s … sha2-256f/s | Hash-based signatures (conservative, slower) |
| **Hybrid** | `hybrid-x25519-ml-kem-768` | X25519 + ML-KEM-768 transition mode (recommended default) |

NIST category 3 (~AES-192 equivalent): ML-KEM-768, ML-DSA-65. Category 5 (~AES-256): ML-KEM-1024, ML-DSA-87.

## Runtime backend

Pondoknusa requires **Node.js 26+** and uses native OpenSSL PQC for all algorithms, including the hybrid X25519 + ML-KEM-768 construction. The `@noble/post-quantum` fallback was removed in v0.12.1.

Detect support at runtime:

```typescript
import { supportsNativePqc } from '@pondoknusa/crypto';

if (supportsNativePqc()) {
  // OpenSSL PQC is available
}
```

## High-level API

`CryptoManager` is the main facade:

```typescript
import { CryptoManager } from '@pondoknusa/crypto';

const crypto = new CryptoManager({
  kem: 'hybrid-x25519-ml-kem-768',
  signature: 'ml-dsa-65',
});

// Key generation
const kemKeys = crypto.generateKeys('hybrid-x25519-ml-kem-768');
const signKeys = crypto.generateKeys('ml-dsa-65');

// Encrypt / decrypt (KEM + AES-256-GCM envelope)
const envelope = crypto.encrypt('secret payload', kemKeys.publicKey);
const plaintext = crypto.decrypt(envelope, kemKeys.secretKey);

// Sign / verify
const signature = crypto.sign('message', signKeys.secretKey);
const valid = crypto.verify(signature, 'message', signKeys.publicKey);
```

Serialize keys for storage or `.env`:

```typescript
import { serializeKeyMaterial, deserializeKeyMaterial } from '@pondoknusa/crypto';

const json = serializeKeyMaterial(signKeys);
// { algorithm, publicKey: '<base64>', secretKey: '<base64>' }
```

## Lower-level classes

Use these when you need algorithm-specific control:

```typescript
import { MlKem, MlDsa, SlhDsa, HybridEncryptor } from '@pondoknusa/crypto';

const hybrid = new HybridEncryptor();
const keys = hybrid.generateKeyPair();
const envelope = hybrid.encrypt(plaintext, keys.publicKey);
const decrypted = hybrid.decrypt(envelope, keys.secretKey);
```

- `MlKem` — ML-KEM-512/768/1024 encapsulation and envelope encryption
- `MlDsa` — ML-DSA-44/65/87 signatures
- `SlhDsa` — SLH-DSA hash-based signatures
- `HybridEncryptor` — X25519 + ML-KEM-768 combined KEM

## Session encryption at rest

When `crypto.session.encrypt` is `true`, `AuthServiceProvider` wraps the database and Redis session drivers with a `PayloadCipher`. Session JSON is encrypted with AES-256-GCM before persistence and prefixed with `pqc1:` so plaintext sessions remain readable during rollout.

```bash
SESSION_ENCRYPT=true
SESSION_ENCRYPTION_KEY=<base64-32-bytes>   # optional if APP_KEY is set
```

The encryption key is either:

1. `SESSION_ENCRYPTION_KEY` — base64, at least 16 bytes decoded, or
2. Derived from `APP_KEY` via scrypt when no dedicated key is set.

The in-memory `array` session driver is never encrypted (intended for tests).

## OAuth access token signing

When `crypto.oauth.signTokens` is `true`, `@pondoknusa/auth-oauth` issues signed bearer tokens instead of opaque random secrets:

```
oat_<base64-payload>.<base64-signature>
```

The payload includes token id, client id, user id, scopes, and expiry. ML-DSA verifies integrity; revocation and expiry still consult the database.

```bash
pondoknusa crypto:generate-keys --algorithm=ml-dsa-65

OAUTH_SIGN_TOKENS=true
OAUTH_TOKEN_PUBLIC_KEY=<base64-public-key>
OAUTH_TOKEN_SECRET_KEY=<base64-secret-key>
```

Legacy opaque tokens continue to work when signing is disabled.

You can also configure signing directly on `oauthServer.tokenSigning` in `config/oauthServer.ts` (created by `pondoknusa oauth:install`) without using `config/crypto.ts`.

## CLI reference

```bash
pondoknusa crypto:generate-keys [--algorithm=<name>] [--format=json|env]
```

Use `--format=env` to print `.env`-ready lines for signing keys (`OAUTH_TOKEN_*`) or session keys (`SESSION_ENCRYPTION_KEY`).

Supported `--algorithm` values:

- `ml-kem-512`, `ml-kem-768`, `ml-kem-1024`
- `hybrid-x25519-ml-kem-768` (default)
- `ml-dsa-44`, `ml-dsa-65`, `ml-dsa-87`
- `slh-dsa-sha2-128f`, `slh-dsa-sha2-128s`, `slh-dsa-sha2-192f`, `slh-dsa-sha2-192s`, `slh-dsa-sha2-256f`, `slh-dsa-sha2-256s`

Output is JSON with `algorithm`, `publicKey`, and `secretKey` as base64 strings.

## Security notes

- Store secret keys in environment variables or a secrets manager, never in source control.
- ML-KEM decapsulation does not authenticate the sender — combine with signatures or channel binding when both confidentiality and authenticity matter.
- SLH-DSA variants with `s` (small) produce shorter signatures but are much slower to sign.
- Native OpenSSL PQC on Node.js 26+ is used for production throughput.
- Hybrid secret keys are packed PKCS#8 material (134 bytes), not the 32-byte Noble root seeds from v0.12.0 — regenerate hybrid keys after upgrading.
- Session encryption protects data at rest in the session store; it does not replace HTTPS for data in transit.

See [Authentication](/guide/auth) for guards, OAuth providers, the OAuth2 server, CSRF, and API token hardening.