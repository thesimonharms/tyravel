import type { DebugRequestEntry } from './types.js';

export function renderDebugBar(entry: DebugRequestEntry, debugPath: string): string {
  const warningCount = entry.warnings.length;
  const queryCount = entry.queries.length;
  const warningClass = warningCount > 0 ? ' tyr-debug-bar--warn' : '';

  return `
<div id="tyr-debug-bar" class="tyr-debug-bar${warningClass}">
  <span><strong>Pondoknusa</strong></span>
  <span>${entry.method} ${entry.path}</span>
  <span>${entry.status}</span>
  <span>${entry.durationMs.toFixed(1)}ms</span>
  <span>${queryCount} queries</span>
  <span>${warningCount} warnings</span>
  <a href="${debugPath}?correlation=${entry.id}" target="_blank" rel="noopener">correlation</a>
  <a href="${debugPath}/${entry.id}" target="_blank" rel="noopener">JSON</a>
  ${entry.replay ? '<span title="curl / fetch snippets available in JSON">replay</span>' : ''}
</div>
<style>
  .tyr-debug-bar {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 99999;
    display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;
    padding: 0.5rem 1rem; font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
    background: #111827; color: #f9fafb; border-top: 2px solid #374151;
  }
  .tyr-debug-bar--warn { border-top-color: #f59e0b; }
  .tyr-debug-bar a { color: #93c5fd; }
</style>`;
}

export async function injectDebugBar(
  response: Response,
  entry: DebugRequestEntry,
  debugPath: string,
): Promise<Response> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) {
    return response;
  }

  const html = await response.text();
  const bar = renderDebugBar(entry, debugPath);
  const injected = html.includes('</body>')
    ? html.replace('</body>', `${bar}</body>`)
    : `${html}${bar}`;

  const headers = new Headers(response.headers);
  headers.delete('content-length');

  return new Response(injected, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}