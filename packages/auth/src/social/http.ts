export async function exchangeAuthorizationCode(options: {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  codeVerifier?: string;
  extraBody?: Record<string, string>;
  headers?: Record<string, string>;
}): Promise<string> {
  const body = new URLSearchParams({
    client_id: options.clientId,
    client_secret: options.clientSecret,
    grant_type: 'authorization_code',
    code: options.code,
    redirect_uri: options.redirectUri,
    ...(options.extraBody ?? {}),
  });

  if (options.codeVerifier) {
    body.set('code_verifier', options.codeVerifier);
  }

  const response = await fetch(options.tokenUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      ...(options.headers ?? {}),
    },
    body,
  });

  const json = (await response.json()) as { access_token?: string; error?: string };
  if (!json.access_token) {
    throw new Error(json.error ?? 'OAuth token exchange failed');
  }

  return json.access_token;
}

export function appendPkceParams(
  params: URLSearchParams,
  context?: { codeChallenge?: string; codeChallengeMethod?: 'S256' },
): void {
  if (!context?.codeChallenge) {
    return;
  }

  params.set('code_challenge', context.codeChallenge);
  params.set('code_challenge_method', context.codeChallengeMethod ?? 'S256');
}