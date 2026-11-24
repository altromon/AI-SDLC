/**
 * AI-SDLC Native MCP Server Tools — Code Graph & Task Context Packer
 * Cites: FR-065-CODE-GRAPH-REPO-MAP-001, FR-065-TASK-CONTEXT-PACKER-001, FR-047-MCP-SERVER-HARDENING-DLP-001
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { DefaultCodeGraphService, DefaultTaskContextPacker } from '@aisdlc/core';
import { executeSecuredTool, type RegisterToolsOptions } from './security.js';

export function registerQueryCodeGraphTool(server: McpServer, options: RegisterToolsOptions): void {
  const graphService = new DefaultCodeGraphService();
  server.tool(
    'query_code_graph',
    'Queries the bounded k-hop code graph around a target file path or symbol name.',
    {
      target: z.string().min(1),
      depth: z.number().int().min(0).max(5).optional(),
      root: z.string().optional(),
    },
    async (params) => {
      return executeSecuredTool('query_code_graph', params, options, async (root) => {
        const data = await graphService.query(root, params.target, params.depth);
        return { data, root };
      });
    }
  );
}

export function registerGetTaskContextTool(server: McpServer, options: RegisterToolsOptions): void {
  const packer = new DefaultTaskContextPacker();
  server.tool(
    'get_task_context',
    'Packs minimal cited specification summaries and k-hop code subgraph for a TSK-* identifier.',
    {
      taskId: z.string().min(1),
      depth: z.number().int().min(0).max(5).optional(),
      root: z.string().optional(),
    },
    async (params) => {
      return executeSecuredTool('get_task_context', params, options, async (root) => {
        const data = await packer.pack(root, params.taskId, params.depth);
        return { data, root };
      });
    }
  );
}

export function registerCodeGraphTools(server: McpServer, options: RegisterToolsOptions = {}): void {
  registerQueryCodeGraphTool(server, options);
  registerGetTaskContextTool(server, options);
}
