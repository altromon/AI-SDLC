/**
 * @aisdlc/core — Code Graph Repo-Map & Task Context Packer Domain Contracts
 * Cites: FR-065-CODE-GRAPH-REPO-MAP-001, FR-065-TASK-CONTEXT-PACKER-001,
 *        SEC-REQ-065-BOUNDED-GRAPH-TRAVERSAL-001, SEC-REQ-065-CODE-GRAPH-FS-JAIL-001,
 *        SEC-REQ-065-CODE-GRAPH-SAFE-EXEC-001, PRIV-REQ-065-CODE-GRAPH-DATA-MINIMIZATION-001
 */

export const CODE_GRAPH_LIMITS = {
  MAX_NODES: 100,
  MAX_EDGES: 250,
  MAX_SYMBOLS_PER_NODE: 64,
  MAX_SIGNATURE_CHARS: 240,
  MAX_INDEX_FILES: 5000,
  MAX_PAYLOAD_BYTES: 65536,
  MAX_DEPTH: 5,
  DEFAULT_DEPTH: 1,
} as const;

export type SymbolKind = 'function' | 'class' | 'interface' | 'type' | 'enum' | 'const' | 'method';

export interface SymbolSignature {
  readonly name: string;
  readonly kind: SymbolKind;
  readonly signature: string;
  readonly exported: boolean;
}

export interface CodeGraphNode {
  readonly path: string;
  readonly language: string;
  readonly extractor: string;
  readonly mtimeMs: number;
  readonly sha256: string;
  readonly symbols: readonly SymbolSignature[];
  readonly imports: readonly string[];
}

export interface CodeGraphEdge {
  readonly from: string;
  readonly to: string;
  readonly kind: 'import' | 're-export' | 'include';
}

export interface CodeGraphDocument {
  readonly version: '1.0';
  readonly generatedAt: string;
  readonly nodes: Record<string, CodeGraphNode>;
}

export interface AdapterExtractResult {
  symbols: SymbolSignature[];
  imports: string[];
  extractor: string;
}

export interface LanguageGraphAdapter {
  readonly id: string;
  supports(relativePath: string): boolean;
  extract(repoRoot: string, relativePath: string, content: string): Promise<AdapterExtractResult>;
}

export interface CodeGraphCachePort {
  load(repoRoot: string): Promise<CodeGraphDocument | null>;
  save(repoRoot: string, doc: CodeGraphDocument): Promise<void>;
}

export interface CodeGraphQueryResult {
  readonly target: string;
  readonly depth: number;
  readonly truncated: boolean;
  readonly nodes: readonly CodeGraphNode[];
  readonly edges: readonly CodeGraphEdge[];
}

export interface SpecSummary {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly status: string;
  readonly summary: string;
}

export interface TaskContextPayload {
  readonly taskId: string;
  readonly depth: number;
  readonly specs: readonly SpecSummary[];
  readonly missingRefs: readonly string[];
  readonly codeSubgraph: CodeGraphQueryResult | null;
}

export interface CodeGraphService {
  indexRepository(repoRoot: string): Promise<CodeGraphDocument>;
  query(repoRoot: string, target: string, depth?: number): Promise<CodeGraphQueryResult>;
  queryMultiple(repoRoot: string, targets: readonly string[], depth?: number): Promise<CodeGraphQueryResult>;
}

export interface TaskContextPacker {
  pack(repoRoot: string, taskId: string, depth?: number): Promise<TaskContextPayload>;
}

export interface McpCodeGraphTools {
  queryCodeGraph(args: { target: string; depth?: number }): Promise<CodeGraphQueryResult>;
  getTaskContext(args: { taskId: string; depth?: number }): Promise<TaskContextPayload>;
}

export interface CliCodeGraphCommands {
  graphQuery(target: string, options?: { depth?: number; json?: boolean }): Promise<number>;
  contextPack(taskId: string, options?: { depth?: number; json?: boolean }): Promise<number>;
}
