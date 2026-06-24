export function normalizeListenEvent(event: string): string {
  return event.startsWith('.') ? event.slice(1) : event;
}

export function formatChannelName(
  name: string,
  visibility: 'public' | 'private' | 'presence',
): string {
  if (visibility === 'public') {
    return stripVisibilityPrefix(name);
  }

  const base = stripVisibilityPrefix(name);
  return visibility === 'private' ? `private-${base}` : `presence-${base}`;
}

function stripVisibilityPrefix(name: string): string {
  if (name.startsWith('private-')) {
    return name.slice('private-'.length);
  }
  if (name.startsWith('presence-')) {
    return name.slice('presence-'.length);
  }
  return name;
}