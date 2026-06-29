import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { discoverMcpTools } from './discover-tools.js';

describe('discoverMcpTools', () => {
  let tempDir = '';

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = '';
    }
  });

  it('returns an empty list when no tools directory exists', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'pondoknusa-mcp-tools-'));
    await expect(discoverMcpTools(tempDir)).resolves.toEqual([]);
  });

  it('discovers exported MCP tools', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'pondoknusa-mcp-tools-'));
    const toolsDir = join(tempDir, 'src/mcp/tools');
    mkdirSync(toolsDir, { recursive: true });
    writeFileSync(
      join(toolsDir, 'ping.js'),
      `export const pingTool = {
        name: 'ping',
        description: 'Ping',
        handler: async () => ({ content: [{ type: 'text', text: 'pong' }] }),
      };`,
    );

    const tools = await discoverMcpTools(tempDir);
    expect(tools).toHaveLength(1);
    expect(tools[0]?.name).toBe('ping');
  });
});