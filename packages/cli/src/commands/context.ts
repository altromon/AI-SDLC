/**
 * CLI Handler: aisdlc context pack
 * Cites: FR-065-TASK-CONTEXT-PACKER-001
 */

import { DefaultTaskContextPacker } from '@aisdlc/core';

export interface ContextPackCliOptions {
  root?: string;
  depth?: number;
  json?: boolean;
}

export async function runContextPack(
  taskId: string,
  options: ContextPackCliOptions = {}
): Promise<number> {
  const root = options.root || process.cwd();
  const packer = new DefaultTaskContextPacker();
  try {
    const payload = await packer.pack(root, taskId, options.depth);
    if (options.json) {
      console.log(JSON.stringify(payload, null, 2));
    } else {
      const nodeCount = payload.codeSubgraph?.nodes.length ?? 0;
      console.log(`Task Context (${payload.taskId}, depth=${payload.depth}): ${payload.specs.length} specs, ${nodeCount} code nodes`);
    }
    return 0;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(options.json ? JSON.stringify({ error: message }) : message);
    return 1;
  }
}
