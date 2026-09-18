/**
 * CLI Handler: aisdlc mcp
 * Starts the native Model Context Protocol (MCP) server
 */

import pc from 'picocolors';
import { startMcpServer } from '@ai-sdlc/mcp';

export interface McpCliOptions {
  root?: string;
  silent?: boolean;
}

export async function runMcpServer(options: McpCliOptions = {}): Promise<void> {
  const rootDir = options.root || process.cwd();
  if (!options.silent) {
    console.error(pc.bold(pc.cyan('\n🚀 [AI-SDLC MCP] Iniciando Servidor Model Context Protocol nativo (stdio)...')));
    console.error(pc.gray(`   Directorio base: ${rootDir}\n`));
  }

  await startMcpServer({ rootDir });
}
