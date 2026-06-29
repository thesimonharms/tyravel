import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { View } from '@pondoknusa/core';
import { buildSsrDocument, Response, streamSsrDocument } from '@pondoknusa/http';
import { hydrate, registerIsland, readManifestFromDocument } from '@pondoknusa/ssr';
import { RenderedView } from '@pondoknusa/testing';

const ROOT = join(import.meta.dirname, '..');

describe('SSR stable API surface', () => {
  it('documents SSR APIs as stable in STABILITY.md', () => {
    const policy = readFileSync(join(ROOT, 'STABILITY.md'), 'utf8');
    const guide = readFileSync(join(ROOT, 'docs/guide/api-stability.md'), 'utf8');

    for (const doc of [policy, guide]) {
      expect(doc).toMatch(/View\.renderStream\(\)/);
      expect(doc).toMatch(/@island/);
      expect(doc).toMatch(/Response\.ssr\(\)|Response\.ssrStream\(\)|buildSsrDocument\(\)|streamSsrDocument\(\)/);
      expect(doc).toMatch(/View\.streamSsr\(\)/);
      expect(doc).toMatch(/registerIsland|@pondoknusa\/ssr/);
    }

    expect(policy).not.toMatch(
      /\| \*\*Views \(P7\)\*\* \| `View\.renderStream\(\)`/,
    );
    expect(policy).toContain('| **SSR & hydration** |');
  });

  it('exports documented SSR entry points from package barrels', () => {
    expect(typeof View.renderStream).toBe('function');
    expect(typeof View.getHydrationManifest).toBe('function');
    expect(typeof Response.ssr).toBe('function');
    expect(typeof Response.ssrStream).toBe('function');
    expect(typeof buildSsrDocument).toBe('function');
    expect(typeof streamSsrDocument).toBe('function');
    expect(typeof View.streamSsr).toBe('function');
    expect(typeof registerIsland).toBe('function');
    expect(typeof hydrate).toBe('function');
    expect(typeof readManifestFromDocument).toBe('function');
    expect(typeof RenderedView.prototype.assertIsland).toBe('function');
    expect(typeof RenderedView.prototype.assertHydrationManifest).toBe('function');
  });
});