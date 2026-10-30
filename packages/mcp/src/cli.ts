/**
 * AI-SDLC MCP CLI Runner
 * Cites: FR-028-NATIVE-MCP-SERVER-001, FR-047-MCP-SERVER-HARDENING-DLP-001
 */

import { startMcpServer } from './server.js';

const rootArgIndex = process.argv.indexOf('--root');
const rootDir =
  rootArgIndex !== -1 && process.argv[rootArgIndex + 1]
    ? process.argv[rootArgIndex + 1]
    : process.cwd();

const roleArgIndex = process.argv.indexOf('--role');
const role =
  roleArgIndex !== -1 && process.argv[roleArgIndex + 1]
    ? process.argv[roleArgIndex + 1]
    : undefined;

startMcpServer({ rootDir, role }).catch((err) => {
  console.error('Failed to start AI-SDLC MCP server:', err);
  process.exit(1);
});
