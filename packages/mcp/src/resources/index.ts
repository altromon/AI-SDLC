/**
 * AI-SDLC Native MCP Server Resources
 * Provides read-only context resources for agents and IDEs.
 */

import * as fs from 'fs';
import * as path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { scanAllProductHandoffs } from '@ai-sdlc/core';

export interface RegisterResourcesOptions {
  rootDir?: string;
}

export function registerAllResources(server: McpServer, options: RegisterResourcesOptions = {}): void {
  const rootDir = options.rootDir || process.cwd();

  // Resource 1: aisdlc://policies/quality
  server.resource(
    'quality-policy',
    'aisdlc://policies/quality',
    async () => {
      const policyPath = path.join(rootDir, 'quality-policy.yaml');
      const text = fs.existsSync(policyPath)
        ? fs.readFileSync(policyPath, 'utf-8')
        : '# quality-policy.yaml not found at project root';
      return {
        contents: [
          {
            uri: 'aisdlc://policies/quality',
            mimeType: 'text/yaml',
            text,
          },
        ],
      };
    }
  );

  // Resource 2: aisdlc://policies/licenses
  server.resource(
    'license-policy',
    'aisdlc://policies/licenses',
    async () => {
      const policyPath = path.join(rootDir, 'license-policy.yaml');
      const text = fs.existsSync(policyPath)
        ? fs.readFileSync(policyPath, 'utf-8')
        : '# license-policy.yaml not found at project root';
      return {
        contents: [
          {
            uri: 'aisdlc://policies/licenses',
            mimeType: 'text/yaml',
            text,
          },
        ],
      };
    }
  );

  // Resource 3: aisdlc://changes/active
  server.resource(
    'active-changes',
    'aisdlc://changes/active',
    async () => {
      const activeDir = path.join(rootDir, 'specs', 'changes', 'active');
      const activeChanges: any[] = [];

      if (fs.existsSync(activeDir)) {
        const entries = fs.readdirSync(activeDir, { withFileTypes: true });
        for (const e of entries) {
          if (e.isDirectory()) {
            const changePath = path.join(activeDir, e.name);
            const handoffPath = path.join(changePath, 'handoff.yaml');
            const tasksPath = path.join(changePath, 'tasks.md');
            const hasHandoff = fs.existsSync(handoffPath);
            const hasTasks = fs.existsSync(tasksPath);

            activeChanges.push({
              changeId: e.name,
              directory: changePath,
              hasHandoff,
              hasTasks,
            });
          }
        }
      }

      return {
        contents: [
          {
            uri: 'aisdlc://changes/active',
            mimeType: 'application/json',
            text: JSON.stringify(activeChanges, null, 2),
          },
        ],
      };
    }
  );

  // Resource 4: aisdlc://changes/completed
  server.resource(
    'completed-changes',
    'aisdlc://changes/completed',
    async () => {
      const completedDir = path.join(rootDir, 'specs', 'changes', 'completed');
      const completedChanges: string[] = [];

      if (fs.existsSync(completedDir)) {
        const entries = fs.readdirSync(completedDir, { withFileTypes: true });
        for (const e of entries) {
          if (e.isDirectory()) {
            completedChanges.push(e.name);
          }
        }
      }

      return {
        contents: [
          {
            uri: 'aisdlc://changes/completed',
            mimeType: 'application/json',
            text: JSON.stringify(completedChanges, null, 2),
          },
        ],
      };
    }
  );

  // Resource 5: aisdlc://status/summary
  server.resource(
    'status-summary',
    'aisdlc://status/summary',
    async () => {
      const handoffs = scanAllProductHandoffs(rootDir);
      const summary = {
        projectRoot: rootDir,
        totalHandoffs: handoffs.size,
        qualityPolicyExists: fs.existsSync(path.join(rootDir, 'quality-policy.yaml')),
        licensePolicyExists: fs.existsSync(path.join(rootDir, 'license-policy.yaml')),
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
    }
  );
}
