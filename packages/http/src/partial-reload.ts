export type TurboStreamAction = 'append' | 'prepend' | 'replace' | 'remove' | 'update';

export interface PartialReloadOptions {
  /** When true, use Turbo Stream content type (`text/vnd.turbo-stream.html`). */
  turboStream?: boolean;
  /** Turbo-Frame id echoed back to the client on frame requests. */
  turboFrame?: string;
  /** HTMX event(s) to fire after the swap (`HX-Trigger`). */
  htmxTrigger?: string | Record<string, unknown>;
  /** URL to push into browser history (`HX-Push-Url`). */
  htmxPushUrl?: string;
  /** Selector to retarget the swap (`HX-Retarget`). */
  htmxRetarget?: string;
  /** Swap strategy override (`HX-Reswap`). */
  htmxReswap?: string;
  /** Additional response headers. */
  headers?: HeadersInit;
}

export function isHtmxRequest(request: Request): boolean {
  return request.headers.get('HX-Request') === 'true';
}

export function isTurboFrameRequest(request: Request): boolean {
  return request.headers.has('Turbo-Frame');
}

export function buildTurboStream(
  action: TurboStreamAction,
  target: string,
  content = '',
): string {
  if (action === 'remove') {
    return `<turbo-stream action="remove" target="${escapeHtmlAttribute(target)}"></turbo-stream>`;
  }

  return `<turbo-stream action="${action}" target="${escapeHtmlAttribute(target)}"><template>${content}</template></turbo-stream>`;
}

export function applyPartialReloadHeaders(
  headers: Headers,
  options: PartialReloadOptions = {},
): void {
  if (options.turboFrame) {
    headers.set('Turbo-Frame', options.turboFrame);
  }

  if (options.htmxTrigger !== undefined) {
    headers.set(
      'HX-Trigger',
      typeof options.htmxTrigger === 'string'
        ? options.htmxTrigger
        : JSON.stringify(options.htmxTrigger),
    );
  }

  if (options.htmxPushUrl) {
    headers.set('HX-Push-Url', options.htmxPushUrl);
  }

  if (options.htmxRetarget) {
    headers.set('HX-Retarget', options.htmxRetarget);
  }

  if (options.htmxReswap) {
    headers.set('HX-Reswap', options.htmxReswap);
  }

  if (options.headers) {
    const extra = new Headers(options.headers);
    extra.forEach((value, key) => {
      headers.set(key, value);
    });
  }
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}