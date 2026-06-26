import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { findFragmentBody, ViewFragmentNotFoundError } from './fragment-ops.js';
import { compile } from './compiler.js';
import { ViewEngine } from './view-engine.js';

describe('fragment ops', () => {
  it('finds nested fragment bodies in compiled templates', () => {
    const template = compile(`@section('content')
@fragment('rows')
  <tr>Row</tr>
@endfragment
@endsection
`);

    expect(findFragmentBody(template.ops, 'rows')?.some((op) => op.type === 'text')).toBe(
      true,
    );
    expect(findFragmentBody(template.ops, 'missing')).toBeUndefined();
  });

  it('renders only a named fragment from a view', async () => {
    const basePath = join(tmpdir(), `tyravel-fragment-${Date.now()}`);
    const viewsPath = join(basePath, 'resources/views');
    mkdirSync(viewsPath, { recursive: true });

    writeFileSync(
      join(viewsPath, 'table.tyr'),
      `<table>
@fragment('rows')
  <tbody>{{ body }}</tbody>
@endfragment
</table>
`,
    );

    const engine = new ViewEngine(basePath, { path: 'resources/views' });
    const html = await engine.renderFragment('table', 'rows', { body: 'Ada' });

    expect(html).toContain('<tbody>Ada</tbody>');
    expect(html).not.toContain('<table>');
  });

  it('throws when a fragment name is missing', async () => {
    const basePath = join(tmpdir(), `tyravel-fragment-miss-${Date.now()}`);
    const viewsPath = join(basePath, 'resources/views');
    mkdirSync(viewsPath, { recursive: true });
    writeFileSync(join(viewsPath, 'empty.tyr'), '<p>Full page</p>');

    const engine = new ViewEngine(basePath, { path: 'resources/views' });

    await expect(engine.renderFragment('empty', 'sidebar', {})).rejects.toThrow(
      ViewFragmentNotFoundError,
    );
  });
});