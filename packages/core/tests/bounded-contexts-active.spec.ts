import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { buildGraphElements, verifyArtifactsSchemas } from '../src/index.js';

describe('Active Bounded Contexts & Dashboard Integration Suite (FR-042-BOUNDED-CONTEXTS-AND-DOCS-001)', () => {
  const rootDir = path.resolve(__dirname, '../../..');
  const bcDir = path.join(rootDir, 'product', 'bounded-contexts');

  it('validates active Bounded Contexts exist on disk and pass JSON Schema validation', () => {
    const expectedBcs = [
      'BC-AI-SDLC-GOVERNANCE.md',
      'BC-OPERATOR-INTERFACE.md',
      'BC-AGENT-INTERFACE.md',
    ];

    for (const bc of expectedBcs) {
      const fullPath = path.join(bcDir, bc);
      expect(fs.existsSync(fullPath)).toBe(true);
    }

    const schemaResult = verifyArtifactsSchemas({ rootDir, targetPath: bcDir });
    expect(schemaResult.success).toBe(true);
    expect(schemaResult.invalidCount).toBe(0);
    expect(schemaResult.totalEvaluated).toBe(3);
  });

  it('ensures buildGraphElements discovers Bounded Contexts in layer "product" with encompasses edges', () => {
    const graph = buildGraphElements(rootDir);
    const nodes = graph.elements.filter((e) => e.group === 'nodes').map((e) => e.data as any);
    const edges = graph.elements.filter((e) => e.group === 'edges').map((e) => e.data as any);

    // 1. Verify BC nodes are in layer "product"
    const govNode = nodes.find((n) => n.id === 'BC-AI-SDLC-GOVERNANCE');
    expect(govNode).toBeDefined();
    expect(govNode?.type).toBe('bounded-context');
    expect(govNode?.layer).toBe('product');

    const cliBcNode = nodes.find((n) => n.id === 'BC-OPERATOR-INTERFACE');
    expect(cliBcNode).toBeDefined();
    expect(cliBcNode?.layer).toBe('product');

    const mcpBcNode = nodes.find((n) => n.id === 'BC-AGENT-INTERFACE');
    expect(mcpBcNode).toBeDefined();
    expect(mcpBcNode?.layer).toBe('product');

    // 2. Verify encompasses edges to components
    const govCoreEdge = edges.find(
      (e) => e.source === 'BC-AI-SDLC-GOVERNANCE' && e.target === 'CMP-CORE'
    );
    expect(govCoreEdge).toBeDefined();
    expect(govCoreEdge?.relation).toBe('encompasses');

    const cliEdge = edges.find(
      (e) => e.source === 'BC-OPERATOR-INTERFACE' && e.target === 'CMP-CLI'
    );
    expect(cliEdge).toBeDefined();
    expect(cliEdge?.relation).toBe('encompasses');

    const mcpEdge = edges.find(
      (e) => e.source === 'BC-AGENT-INTERFACE' && e.target === 'CMP-MCP-SERVER'
    );
    expect(mcpEdge).toBeDefined();
    expect(mcpEdge?.relation).toBe('encompasses');
  });
});
