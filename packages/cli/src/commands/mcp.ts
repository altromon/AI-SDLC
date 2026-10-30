/**
 * CLI Handler: aisdlc mcp
 * Starts the native Model Context Protocol (MCP) server
 * Cites: FR-028-NATIVE-MCP-SERVER-001, FR-047-MCP-SERVER-HARDENING-DLP-001
 */

import pc from 'picocolors';
import { startMcpServer } from '@aisdlc/mcp';

export interface McpCliOptions {
  root?: string;
  role?: string;
  silent?: boolean;
}

export async function runMcpServer(options: McpCliOptions = {}): Promise<void> {
  const rootDir = options.root || process.cwd();
  if (!options.silent) {
    console.error(pc.bold(pc.cyan('\n🚀 [AI-SDLC MCP] Starting native Model Context Protocol (MCP) server (stdio)...')));
    console.error(pc.gray(`   Base directory: ${rootDir}`));
    if (options.role) {
      console.error(pc.gray(`   Role context:   ${options.role}\n`));
    } else {
      console.error('');
    }
  }

  await startMcpServer({ rootDir, role: options.role });
}
