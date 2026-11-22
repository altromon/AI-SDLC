/**
 * AI-SDLC Native MCP Server Resources
 * Provides read-only context resources for agents and IDEs.
 * Cites: FR-028-NATIVE-MCP-SERVER-001, FR-047-MCP-SERVER-HARDENING-DLP-001
 */

import * as fs from 'fs';
import * as path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { scanAllProductHandoffs } from '@aisdlc/core';
import { assertWithinRoot } from '../tools/security.js';

export interface RegisterResourcesOptions {
  rootDir?: string;
}

export function registerSinglePolicyResource(
  server: McpServer,
  rootDir: string,
  name: string,
  uri: string,
  filename: string
): void {
  const policyPath = assertWithinRoot(filename, rootDir, 'filename');
  server.resource(name, uri, async () => {
    const text =
      fs.existsSync(policyPath) && fs.statSync(policyPath).isFile()
        ? fs.readFileSync(policyPath, 'utf-8')
        : `# ${filename} not found at project root`;
    return {
      contents: [{ uri, mimeType: 'text/yaml', text }],
    };
  });
}

export function registerPolicyResources(server: McpServer, rootDir: string): void {
  registerSinglePolicyResource(server, rootDir, 'quality-policy', 'aisdlc://policies/quality', 'quality-policy.yaml');
  registerSinglePolicyResource(server, rootDir, 'license-policy', 'aisdlc://policies/licenses', 'license-policy.yaml');
  registerSinglePolicyResource(server, rootDir, 'privacy-policy', 'aisdlc://policies/privacy', 'privacy-policy.yaml');
}

export function getActiveChanges(activeDir: string) {
  if (!fs.existsSync(activeDir) || !fs.statSync(activeDir).isDirectory()) return [];
  const entries = fs.readdirSync(activeDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => {
      const changePath = path.join(activeDir, e.name);
      return {
        changeId: e.name,
        directory: changePath,
        hasHandoff: fs.existsSync(path.join(changePath, 'handoff.yaml')),
        hasTasks: fs.existsSync(path.join(changePath, 'tasks.md')),
      };
    })
    .sort((a, b) => a.changeId.localeCompare(b.changeId));
}

export function getCompletedChanges(completedDir: string) {
  if (!fs.existsSync(completedDir) || !fs.statSync(completedDir).isDirectory()) return [];
  return fs
    .readdirSync(completedDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));
}

export function registerChangeResources(server: McpServer, rootDir: string): void {
  server.resource('active-changes', 'aisdlc://changes/active', async () => {
    const activeDir = path.join(rootDir, 'specs', 'changes', 'active');
    return {
      contents: [
        {
          uri: 'aisdlc://changes/active',
          mimeType: 'application/json',
          text: JSON.stringify(getActiveChanges(activeDir), null, 2),
        },
      ],
    };
  });

  server.resource('completed-changes', 'aisdlc://changes/completed', async () => {
    const completedDir = path.join(rootDir, 'specs', 'changes', 'completed');
    return {
      contents: [
        {
          uri: 'aisdlc://changes/completed',
          mimeType: 'application/json',
          text: JSON.stringify(getCompletedChanges(completedDir), null, 2),
        },
      ],
    };
  });
}

export function registerStatusResources(server: McpServer, rootDir: string): void {
  server.resource('status-summary', 'aisdlc://status/summary', async () => {
    const handoffs = scanAllProductHandoffs(rootDir);
    const summary = {
      projectRoot: rootDir,
      totalHandoffs: handoffs.size,
      qualityPolicyExists: fs.existsSync(path.join(rootDir, 'quality-policy.yaml')),
      licensePolicyExists: fs.existsSync(path.join(rootDir, 'license-policy.yaml')),
      privacyPolicyExists: fs.existsSync(path.join(rootDir, 'privacy-policy.yaml')),
      timestamp: new Date().toISOString(),
    };

    return {
      contents: [
        {
          uri: 'aisdlc://status/summary',
          mimeType: 'application/json',
          text: JSON.stringify(summary, null, 2),
        },
      ],
    };
  });
}

export function registerAllResources(server: McpServer, options: RegisterResourcesOptions = {}): void {
  const rootDir = path.resolve(options.rootDir || process.cwd());
  registerPolicyResources(server, rootDir);
  registerChangeResources(server, rootDir);
  registerStatusResources(server, rootDir);
}
