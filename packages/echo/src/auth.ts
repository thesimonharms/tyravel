import type { EchoAuthResponse, EchoAuthTransport } from './types.js';

export interface CreateAuthTransportOptions {
  endpoint?: string;
  csrfToken?: string | (() => string | undefined);
  credentials?: RequestCredentials;
  headers?: Record<string, string>;
}

export function createAuthTransport(options: CreateAuthTransportOptions = {}): EchoAuthTransport {
  const endpoint = options.endpoint ?? '/broadcasting/auth';
  const credentials = options.credentials ?? 'include';

  return {
    async authorize(socketId, channelName, channelData) {
      const headers = new Headers({
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...options.headers,
      });

      const csrf = resolveCsrfToken(options.csrfToken);
      if (csrf) {
        headers.set('X-CSRF-TOKEN', csrf);
      }

      const body: Record<string, string> = {
        socket_id: socketId,
        channel_name: channelName,
      };

      if (channelData) {
        body.channel_data = channelData;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        credentials,
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Broadcast auth failed (${response.status}).`);
      }

      return (await response.json()) as EchoAuthResponse;
    },
  };
}

export function readCsrfTokenFromDocument(): string | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta?.getAttribute('content') ?? undefined;
}

function resolveCsrfToken(
  token?: string | (() => string | undefined),
): string | undefined {
  if (typeof token === 'function') {
    return token() ?? readCsrfTokenFromDocument();
  }
  return token ?? readCsrfTokenFromDocument();
}