/**
 * AI-SDLC MCP CLI Runner
 */

import { startMcpServer } from './server.js';

const rootArgIndex = process.argv.indexOf('--root');
const rootDir =
  rootArgIndex !== -1 && process.argv[rootArgIndex + 1]
    ? process.argv[rootArgIndex + 1]
    : process.cwd();

startMcpServer({ rootDir }).catch((err) => {
  console.error('Failed to start AI-SDLC MCP server:', err);
  process.exit(1);
});
