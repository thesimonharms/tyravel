import { describe, expect, it } from 'vitest';
import { detectTypeScriptRuntime } from './runtime.js';

describe('detectTypeScriptRuntime', () => {
  it('detects the current Node runtime on Node 26+', () => {
    const runtime = detectTypeScriptRuntime();
    if (Number(process.versions.node.split('.')[0]) >= 26) {
      expect(runtime?.name).toBe('Node');
      expect(runtime?.entryArgs('src/main.ts')).toContain('src/main.ts');
    }
  });
});