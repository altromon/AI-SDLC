/**
 * AI-SDLC Native MCP Server Tools
 * Full catalog of SDD scaffolding, verification, reporting, and governance tools.
 * Includes hardening: Path Confinement, Universal DLP, Role-Based Access Control & Audit Trail.
 * Cites: FR-028-NATIVE-MCP-SERVER-001, FR-047-MCP-SERVER-HARDENING-DLP-001
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RegisterToolsOptions } from './security.js';
import { registerLifecycleAndSddTools } from './lifecycle.js';
import { registerVerificationTools } from './verification.js';
import { registerReportingAndKpiTools } from './reporting.js';

export * from './security.js';
export * from './composite-gates.js';
export * from './lifecycle.js';
export * from './verification.js';
export * from './reporting.js';

export function registerAllTools(server: McpServer, options: RegisterToolsOptions = {}): void {
  registerLifecycleAndSddTools(server, options);
  registerVerificationTools(server, options);
  registerReportingAndKpiTools(server, options);
}
