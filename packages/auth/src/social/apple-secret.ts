import { createPrivateKey, sign } from 'node:crypto';

function base64Url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

export function createAppleClientSecret(input: {
  teamId: string;
  keyId: string;
  clientId: string;
  privateKey: string;
}): string {
  const header = base64Url(JSON.stringify({ alg: 'ES256', kid: input.keyId }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64Url(
    JSON.stringify({
      iss: input.teamId,
      iat: now,
      exp: now + 60 * 60 * 24 * 180,
      aud: 'https://appleid.apple.com',
      sub: input.clientId,
    }),
  );
  const unsigned = `${header}.${payload}`;
  const key = createPrivateKey({ key: input.privateKey, format: 'pem' });
  const signature = sign('sha256', Buffer.from(unsigned), {
    key,
    dsaEncoding: 'ieee-p1363',
  });

  return `${unsigned}.${base64Url(signature)}`;
}