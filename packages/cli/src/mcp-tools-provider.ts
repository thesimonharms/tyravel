import { discoverMcpTools, type McpTool } from '@pondoknusa/mcp';
import { Application, ServiceProvider } from '@pondoknusa/core';

export class McpToolsServiceProvider extends ServiceProvider {
  override async register(): Promise<void> {
    const tools = await discoverMcpTools(this.app.basePath);
    this.app.instance('mcp.tools', tools);
    this.app.singleton('mcp.tools', () => tools);
  }
}

export async function resolveMcpTools(app: Application): Promise<McpTool[]> {
  await app.bootLazyProvidersForBinding('mcp.tools');
  return app.make<McpTool[]>('mcp.tools');
}