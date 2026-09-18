/**
 * AI-SDLC Model Context Protocol (MCP) Server Factory
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAllTools, RegisterToolsOptions } from './tools/index.js';
import { registerAllResources, RegisterResourcesOptions } from './resources/index.js';

export interface CreateMcpServerOptions extends RegisterToolsOptions, RegisterResourcesOptions {
  name?: string;
  version?: string;
}

export function createMcpServer(options: CreateMcpServerOptions = {}): McpServer {
  const server = new McpServer({
    name: options.name || 'ai-sdlc-mcp-server',
    version: options.version || '1.0.0',
  });

  registerAllTools(server, options);
  registerAllResources(server, options);

  return server;
}

export async function startMcpServer(options: CreateMcpServerOptions = {}): Promise<void> {
  const server = createMcpServer(options);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
