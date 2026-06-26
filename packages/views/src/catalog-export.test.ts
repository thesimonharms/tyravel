import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { buildViewCatalog } from './island-catalog.js';
import { serializeViewCatalog } from './catalog-export.js';

describe('serializeViewCatalog', () => {
  it('adds typed prop schemas for design-system export', () => {
    const basePath = join(tmpdir(), `tyravel-catalog-export-${Date.now()}`);
    const viewsPath = join(basePath, 'resources/views/components');
    mkdirSync(viewsPath, { recursive: true });

    writeFileSync(
      join(viewsPath, 'badge.tyr'),
      `@props(['label', 'count' => 0])
<span>{{ label }}</span>
`,
    );

    const exported = serializeViewCatalog(
      buildViewCatalog(basePath, { path: 'resources/views' }),
    );

    expect(exported.generatedAt).toBeTruthy();
    expect(exported.components[0]).toMatchObject({
      name: 'badge',
      propsSchema: [
        { name: 'label', required: true, tsType: 'unknown' },
        { name: 'count', required: false, tsType: 'number' },
      ],
    });
  });
});