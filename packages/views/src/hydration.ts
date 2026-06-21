export interface HydrationIsland {
  id: string;
  html: string;
  props: Record<string, unknown>;
}

export class HydrationManifest {
  private readonly islands: HydrationIsland[] = [];

  register(id: string, html: string, props: Record<string, unknown> = {}): void {
    this.islands.push({ id, html, props });
  }

  toJSON(): { islands: HydrationIsland[] } {
    return { islands: [...this.islands] };
  }

  getIslands(): readonly HydrationIsland[] {
    return this.islands;
  }

  clear(): void {
    this.islands.length = 0;
  }
}

export function renderIslandWrapper(
  id: string,
  html: string,
  props: Record<string, unknown>,
): string {
  const encodedProps = encodeIslandProps(props);
  return `<div data-tyr-island="${escapeAttr(id)}" data-tyr-props="${encodedProps}">${html}</div>`;
}

function encodeIslandProps(props: Record<string, unknown>): string {
  return escapeAttr(JSON.stringify(props));
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}