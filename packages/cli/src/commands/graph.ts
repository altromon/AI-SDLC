/**
 * CLI Handler: aisdlc graph query
 * Cites: FR-065-CODE-GRAPH-REPO-MAP-001
 */

import { DefaultCodeGraphService } from '@aisdlc/core';

export interface GraphQueryCliOptions {
  root?: string;
  depth?: number;
  json?: boolean;
}

export interface GraphIndexCliOptions {
  root?: string;
  json?: boolean;
}

export async function runGraphIndex(options: GraphIndexCliOptions = {}): Promise<number> {
  const root = options.root || process.cwd();
  const service = new DefaultCodeGraphService();
  try {
    const doc = await service.indexRepository(root);
    const indexedFiles = Object.keys(doc.nodes).length;
    if (options.json) {
      console.log(JSON.stringify({ indexedFiles, generatedAt: doc.generatedAt }, null, 2));
    } else {
      console.log(`Code Graph indexed: ${indexedFiles} files cached in .aisdlc/cache/code-graph.json`);
    }
    return 0;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(options.json ? JSON.stringify({ error: message }) : message);
    return 1;
  }
}

export async function runGraphQuery(
  target: string,
  options: GraphQueryCliOptions = {}
): Promise<number> {
  const root = options.root || process.cwd();
  const service = new DefaultCodeGraphService();
  try {
    const result = await service.query(root, target, options.depth);
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`Code Graph (${result.target}, depth=${result.depth}): ${result.nodes.length} nodes, ${result.edges.length} edges`);
    }
    return 0;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(options.json ? JSON.stringify({ error: message }) : message);
    return 1;
  }
}
