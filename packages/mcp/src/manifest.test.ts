import { describe, expect, it } from 'vitest';
import { buildCapabilityManifest } from './manifest.js';

describe('buildCapabilityManifest', () => {
  it('includes core packages, facades, and CLI commands', () => {
    const manifest = buildCapabilityManifest();
    expect(manifest.packages).toContain('@pondoknusa/vector');
    expect(manifest.packages).toContain('@pondoknusa/graphql');
    expect(manifest.packages).toContain('@pondoknusa/mcp');
    expect(manifest.facades).toContain('Route');
    expect(manifest.commands).toContain('pondoknusa vector:embed');
    expect(manifest.commands).toContain('pondoknusa mcp:serve');
  });
});