import { buildAppManifest, createFrameworkTools } from './framework-tools.js';
import type { AppMcpContext, CapabilityManifest } from './types.js';

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

type JsonRpcRequest = {
  jsonrpc: '2.0';
  id?: number | string;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcResponse = {
  jsonrpc: '2.0';
  id?: number | string;
  result?: unknown;
  error?: { code: number; message: string };
};

export class PondoknusaMcpServer {
  private readonly frameworkTools: McpTool[];

  constructor(
    private readonly manifest: CapabilityManifest,
    private readonly tools: McpTool[] = [],
    context?: AppMcpContext,
  ) {
    this.frameworkTools = context ? createFrameworkTools(context) : [];
  }

  static fromApp(context: AppMcpContext, tools: McpTool[] = []): PondoknusaMcpServer {
    return new PondoknusaMcpServer(buildAppManifest(context), tools, context);
  }

  async runStdio(): Promise<void> {
    const stdin = process.stdin;
    let buffer = '';

    for await (const chunk of stdin) {
      buffer += String(chunk);
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }
        const response = await this.handleLine(trimmed);
        if (response) {
          process.stdout.write(`${JSON.stringify(response)}\n`);
        }
      }
    }
  }

  private async handleLine(line: string): Promise<JsonRpcResponse | null> {
    let request: JsonRpcRequest;
    try {
      request = JSON.parse(line) as JsonRpcRequest;
    } catch {
      return null;
    }

    if (request.method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'pondoknusa-mcp', version: this.manifest.version },
          capabilities: { tools: {} },
        },
      };
    }

    if (request.method === 'tools/list') {
      const tools = [...this.frameworkTools, ...this.tools];
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          tools: tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          })),
        },
      };
    }

    if (request.method === 'tools/call') {
      const params = request.params ?? {};
      const name = String(params.name ?? '');
      const args = (params.arguments ?? {}) as Record<string, unknown>;

      const tool = [...this.frameworkTools, ...this.tools].find((entry) => entry.name === name);
      if (!tool) {
        return {
          jsonrpc: '2.0',
          id: request.id,
          error: { code: -32601, message: `Unknown tool: ${name}` },
        };
      }

      const output = await tool.handler(args);
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          content: [{ type: 'text', text: typeof output === 'string' ? output : JSON.stringify(output) }],
        },
      };
    }

    return {
      jsonrpc: '2.0',
      id: request.id,
      error: { code: -32601, message: `Unsupported method: ${request.method}` },
    };
  }
}