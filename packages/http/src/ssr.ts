export interface HydrationIslandPayload {
  id: string;
  html: string;
  props: Record<string, unknown>;
}

export interface HydrationManifestPayload {
  islands: HydrationIslandPayload[];
}

export type HydrationManifestSource =
  | HydrationManifestPayload
  | (() => HydrationManifestPayload);

export interface SsrDocumentOptions {
  /** Document title when wrapping a fragment (ignored when body is a full HTML document). */
  title?: string;
  /** `lang` attribute on `<html>` when wrapping a fragment. */
  lang?: string;
  /** Extra markup injected before `</head>` (e.g. `@vite` tags). */
  head?: string;
  /** Serialized into `<script type="application/json" id="tyr-hydration">`. */
  hydrationManifest?: HydrationManifestPayload;
}

export interface SsrStreamOptions extends Omit<SsrDocumentOptions, 'hydrationManifest'> {
  /**
   * Hydration manifest injected before `</body>`.
   * A function is resolved after the view stream completes (for `View.renderStream()`).
   */
  hydrationManifest?: HydrationManifestSource;
}

const HYDRATION_SCRIPT_ID = 'tyr-hydration';

export function buildSsrDocument(body: string, options: SsrDocumentOptions = {}): string {
  const injections = buildInjections(options);

  if (isFullHtmlDocument(body)) {
    return injectIntoDocument(body, injections);
  }

  return wrapFragment(body, options, injections);
}

function resolveHydrationManifest(
  source?: HydrationManifestSource,
): HydrationManifestPayload | undefined {
  if (!source) {
    return undefined;
  }

  return typeof source === 'function' ? source() : source;
}

function buildInjections(options: {
  head?: string;
  hydrationManifest?: HydrationManifestPayload;
}): { head: string; body: string } {
  const head = options.head?.trim() ?? '';
  const manifest = options.hydrationManifest;
  const body = manifest && manifest.islands.length > 0
    ? `<script type="application/json" id="${HYDRATION_SCRIPT_ID}">${escapeJsonForHtml(
        JSON.stringify(manifest),
      )}</script>`
    : '';

  return { head, body };
}

export async function* streamSsrDocument(
  source: AsyncIterable<string>,
  options: SsrStreamOptions = {},
): AsyncGenerator<string> {
  const iterator = source[Symbol.asyncIterator]();
  const first = await iterator.next();

  if (first.done) {
    yield buildSsrDocument('', {
      ...options,
      hydrationManifest: resolveHydrationManifest(options.hydrationManifest),
    });
    return;
  }

  if (isFullHtmlDocument(first.value)) {
    yield* streamFullHtmlDocument(iterator, first.value, options);
    return;
  }

  yield* streamFragmentDocument(iterator, first.value, options);
}

async function* streamFragmentDocument(
  iterator: AsyncIterator<string>,
  first: string,
  options: SsrStreamOptions,
): AsyncGenerator<string> {
  const headSnippet = options.head?.trim() ?? '';
  const title = escapeHtml(options.title ?? 'Tyravel');
  const lang = escapeHtml(options.lang ?? 'en');
  const head = headSnippet ? `\n  ${headSnippet}` : '';

  yield `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>${head}
</head>
<body>
`;

  yield first;

  let next = await iterator.next();
  while (!next.done) {
    yield next.value;
    next = await iterator.next();
  }

  const manifest = resolveHydrationManifest(options.hydrationManifest);
  const injections = buildInjections({ head: options.head, hydrationManifest: manifest });
  const hydration = injections.body ? `\n  ${injections.body}` : '';
  yield `${hydration}
</body>
</html>`;
}

async function* streamFullHtmlDocument(
  iterator: AsyncIterator<string>,
  first: string,
  options: SsrStreamOptions,
): AsyncGenerator<string> {
  const headSnippet = options.head?.trim() ?? '';
  let headInjected = !headSnippet;
  let manifestInjected = false;

  async function* remaining(): AsyncGenerator<string> {
    let next = await iterator.next();
    while (!next.done) {
      yield next.value;
      next = await iterator.next();
    }
  }

  for await (const chunk of prependAsync(first, remaining())) {
    let output = chunk;

    if (!headInjected && output.includes('</head>')) {
      output = injectBeforeCloseTag(output, 'head', headSnippet);
      headInjected = true;
    }

    if (!manifestInjected && output.includes('</body>')) {
      const manifest = resolveHydrationManifest(options.hydrationManifest);
      const injections = buildInjections({ hydrationManifest: manifest });
      if (injections.body) {
        output = injectBeforeCloseTag(output, 'body', injections.body);
        manifestInjected = true;
      }
    }

    yield output;
  }

  if (!manifestInjected) {
    const manifest = resolveHydrationManifest(options.hydrationManifest);
    const injections = buildInjections({ hydrationManifest: manifest });
    if (injections.body) {
      yield `\n${injections.body}`;
    }
  }
}

async function* prependAsync(
  first: string,
  rest: AsyncIterable<string>,
): AsyncGenerator<string> {
  yield first;
  yield* rest;
}

function isFullHtmlDocument(body: string): boolean {
  const trimmed = body.trimStart().toLowerCase();
  return trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html');
}

function injectIntoDocument(
  body: string,
  injections: { head: string; body: string },
): string {
  let html = body;

  if (injections.head) {
    html = injectBeforeCloseTag(html, 'head', injections.head);
  }

  if (injections.body) {
    html = injectBeforeCloseTag(html, 'body', injections.body);
  }

  return html;
}

function wrapFragment(
  body: string,
  options: SsrDocumentOptions,
  injections: { head: string; body: string },
): string {
  const title = escapeHtml(options.title ?? 'Tyravel');
  const lang = escapeHtml(options.lang ?? 'en');
  const head = injections.head ? `\n  ${injections.head}` : '';
  const hydration = injections.body ? `\n  ${injections.body}` : '';

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>${head}
</head>
<body>
${body}${hydration}
</body>
</html>`;
}

function injectBeforeCloseTag(html: string, tagName: string, snippet: string): string {
  const pattern = new RegExp(`</${tagName}\\s*>`, 'i');
  const match = pattern.exec(html);
  if (!match || match.index === undefined) {
    return `${html}\n${snippet}`;
  }

  const index = match.index;
  return `${html.slice(0, index)}${snippet}\n${html.slice(index)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeJsonForHtml(json: string): string {
  return json.replace(/</g, '\\u003c');
}

export { HYDRATION_SCRIPT_ID };