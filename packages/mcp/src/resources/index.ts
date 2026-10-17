/**
 * AI-SDLC Native MCP Server Resources
 * Provides read-only context resources for agents and IDEs.
 */

import * as fs from 'fs';
import * as path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { scanAllProductHandoffs } from '@aisdlc/core';

export interface RegisterResourcesOptions {
  rootDir?: string;
}

function registerSinglePolicyResource(
  server: McpServer,
  rootDir: string,
  name: string,
  uri: string,
  filename: string
): void {
  server.resource(name, uri, async () => {
    const policyPath = path.join(rootDir, filename);
    const text = fs.existsSync(policyPath)
      ? fs.readFileSync(policyPath, 'utf-8')
      : `# ${filename} not found at project root`;
    return {
      contents: [{ uri, mimeType: 'text/yaml', text }],
    };
  });
}

function registerPolicyResources(server: McpServer, rootDir: string): void {
  registerSinglePolicyResource(server, rootDir, 'quality-policy', 'aisdlc://policies/quality', 'quality-policy.yaml');
  registerSinglePolicyResource(server, rootDir, 'license-policy', 'aisdlc://policies/licenses', 'license-policy.yaml');
  registerSinglePolicyResource(server, rootDir, 'privacy-policy', 'aisdlc://policies/privacy', 'privacy-policy.yaml');
}

function getActiveChanges(activeDir: string) {
  if (!fs.existsSync(activeDir)) return [];
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
    });
}

function getCompletedChanges(completedDir: string) {
  if (!fs.existsSync(completedDir)) return [];
  return fs
    .readdirSync(completedDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

function registerChangeResources(server: McpServer, rootDir: string): void {
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

function registerStatusResources(server: McpServer, rootDir: string): void {
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
  const rootDir = options.rootDir || process.cwd();
  registerPolicyResources(server, rootDir);
  registerChangeResources(server, rootDir);
  registerStatusResources(server, rootDir);
}
