import type { CryptoConfig } from '@tyravel/crypto';
import { env } from '@tyravel/config';

export default {
  kem: 'hybrid-x25519-ml-kem-768',
  signature: 'ml-dsa-65',
  preferNative: true,
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