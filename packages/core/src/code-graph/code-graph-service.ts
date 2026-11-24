/**
 * @aisdlc/core — CodeGraphService (Incremental Indexing & Bounded k-Hop BFS Traversal)
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { createDefaultLanguageAdapters } from './adapters/index.js';
import { assertConfinedPath, FsCodeGraphCache, sanitizeNode } from './cache/fs-code-graph-cache.js';
import {
  CODE_GRAPH_LIMITS,
  type CodeGraphCachePort,
  type CodeGraphDocument,
  type CodeGraphEdge,
  type CodeGraphNode,
  type CodeGraphQueryResult,
  type CodeGraphService,
  type LanguageGraphAdapter,
} from './types.js';

const EXCLUDED_DIRS = new Set(['.git', 'node_modules', '.aisdlc', 'dist', 'build', 'target', '.venv', 'venv']);
const EXCLUDED_EXTENSIONS = new Set(['.pem', '.key', '.p12', '.pfx', '.crt']);
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const EXTENSION_CANDIDATES = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.rs', '.cpp', '.hpp', '.h'];

function isExcludedFile(name: string): boolean {
  return name === '.env' || name.startsWith('.env.') || EXCLUDED_EXTENSIONS.has(path.extname(name).toLowerCase());
}

function detectLanguage(relPath: string): string {
  const map: Record<string, string> = {
    '.ts': 'typescript', '.tsx': 'typescript', '.mts': 'typescript', '.cts': 'typescript',
    '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
    '.py': 'python', '.pyi': 'python', '.go': 'go', '.rs': 'rust',
    '.c': 'cpp', '.cpp': 'cpp', '.cc': 'cpp', '.cxx': 'cpp', '.h': 'cpp', '.hpp': 'cpp', '.hh': 'cpp',
    '.java': 'java', '.cs': 'csharp',
  };
  return map[path.extname(relPath).toLowerCase()] ?? 'unknown';
}

export function processDirEntry(
  repoRoot: string,
  currentDir: string,
  entry: fs.Dirent,
  adapters: readonly LanguageGraphAdapter[],
  results: string[]
): void {
  if (entry.isDirectory()) {
    if (!EXCLUDED_DIRS.has(entry.name)) {
      collectSourceFiles(repoRoot, path.join(currentDir, entry.name), adapters, results);
    }
    return;
  }
  if (!entry.isFile() || isExcludedFile(entry.name)) return;
  const relPath = path.relative(repoRoot, path.join(currentDir, entry.name)).replace(/\\/g, '/');
  if (adapters.some((a) => a.supports(relPath))) results.push(relPath);
}

export function collectSourceFiles(
  repoRoot: string,
  currentDir: string,
  adapters: readonly LanguageGraphAdapter[],
  results: string[]
): void {
  if (results.length >= CODE_GRAPH_LIMITS.MAX_INDEX_FILES) return;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(currentDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return;
  }
  for (const entry of entries) {
    if (results.length >= CODE_GRAPH_LIMITS.MAX_INDEX_FILES) return;
    processDirEntry(repoRoot, currentDir, entry, adapters, results);
  }
}

export function validateDepth(depth: number | undefined): number {
  const resolved = depth === undefined ? CODE_GRAPH_LIMITS.DEFAULT_DEPTH : depth;
  if (!Number.isInteger(resolved) || resolved < 0 || resolved > CODE_GRAPH_LIMITS.MAX_DEPTH) {
    throw new Error(`ERR_INVALID_DEPTH: Depth '${String(depth)}' must be an integer between 0 and ${CODE_GRAPH_LIMITS.MAX_DEPTH}.`);
  }
  return resolved;
}

export function validateTargetInput(repoRoot: string, target: string): string {
  if (!target || target.includes('\0')) {
    throw new Error('ERR_PATH_TRAVERSAL_DETECTED: Empty or null-byte target rejected.');
  }
  const normalized = target.replace(/\\/g, '/').replace(/^\.\//, '');
  if (/(?:^|\/)\.\.(?:\/|$)/.test(normalized) || normalized.includes('..')) {
    throw new Error(`ERR_PATH_TRAVERSAL_DETECTED: Traversal sequence rejected in target '${target}'.`);
  }
  if (normalized.includes('/')) assertConfinedPath(repoRoot, normalized);
  return normalized;
}

export function resolveImportToNodePath(fromPath: string, specifier: string, nodes: Record<string, CodeGraphNode>): string | null {
  if (Object.hasOwn(nodes, specifier)) return specifier;
  if (!specifier.startsWith('.')) return null;
  const rawJoined = path.posix.normalize(path.posix.join(path.posix.dirname(fromPath), specifier));
  const strippedExt = rawJoined.replace(/\.(js|jsx|mjs|cjs)$/i, '');
  for (const base of [rawJoined, strippedExt]) {
    for (const ext of EXTENSION_CANDIDATES) {
      if (Object.hasOwn(nodes, `${base}${ext}`)) return `${base}${ext}`;
      if (ext && Object.hasOwn(nodes, `${base}/index${ext}`)) return `${base}/index${ext}`;
    }
  }
  return null;
}

export function resolveStartNodes(doc: CodeGraphDocument, normTarget: string): string[] {
  if (Object.hasOwn(doc.nodes, normTarget)) return [normTarget];
  return Object.keys(doc.nodes).filter((k) => doc.nodes[k].symbols.some((s) => s.name === normTarget));
}

export interface BfsState {
  nodes: CodeGraphNode[];
  edges: CodeGraphEdge[];
  visited: Set<string>;
  edgeKeys: Set<string>;
  truncated: boolean;
  approxBytes: number;
}

export function canAddNode(state: BfsState, node: CodeGraphNode): boolean {
  if (state.nodes.length >= CODE_GRAPH_LIMITS.MAX_NODES) return false;
  return state.approxBytes + Buffer.byteLength(JSON.stringify(node), 'utf-8') <= CODE_GRAPH_LIMITS.MAX_PAYLOAD_BYTES;
}

export function initBfsQueue(doc: CodeGraphDocument, startNodes: readonly string[], visited: Set<string>) {
  const queue: Array<{ path: string; hop: number }> = [];
  for (const s of startNodes) {
    if (!visited.has(s) && Object.hasOwn(doc.nodes, s)) {
      visited.add(s);
      queue.push({ path: s, hop: 0 });
    }
  }
  return queue;
}

export function addEdgeIfMissing(from: string, to: string, state: BfsState): boolean {
  const edgeKey = `${from}->${to}`;
  if (state.edgeKeys.has(edgeKey)) return true;
  if (state.edges.length >= CODE_GRAPH_LIMITS.MAX_EDGES) {
    state.truncated = true;
    return false;
  }
  state.edgeKeys.add(edgeKey);
  state.edges.push({ from, to, kind: 'import' });
  return true;
}

export function enqueueNeighbors(
  doc: CodeGraphDocument,
  node: CodeGraphNode,
  hop: number,
  queue: Array<{ path: string; hop: number }>,
  state: BfsState
): void {
  for (const imp of node.imports) {
    const targetPath = resolveImportToNodePath(node.path, imp, doc.nodes);
    if (!targetPath) continue;
    if (!addEdgeIfMissing(node.path, targetPath, state)) return;
    if (!state.visited.has(targetPath)) {
      state.visited.add(targetPath);
      queue.push({ path: targetPath, hop: hop + 1 });
    }
  }
}

export function traverseKHop(doc: CodeGraphDocument, startNodes: readonly string[], depth: number) {
  const state: BfsState = { nodes: [], edges: [], visited: new Set(), edgeKeys: new Set(), truncated: false, approxBytes: 128 };
  const queue = initBfsQueue(doc, startNodes, state.visited);
  while (queue.length > 0) {
    const current = queue.shift()!;
    const node = doc.nodes[current.path];
    if (!canAddNode(state, node)) {
      state.truncated = true;
      break;
    }
    state.nodes.push(node);
    state.approxBytes += Buffer.byteLength(JSON.stringify(node), 'utf-8');
    if (current.hop < depth) enqueueNeighbors(doc, node, current.hop, queue, state);
  }
  return { truncated: state.truncated, nodes: state.nodes, edges: state.edges };
}

export async function extractWithAdapter(
  repoRoot: string,
  relPath: string,
  content: string,
  sha256: string,
  mtimeMs: number,
  adapters: readonly LanguageGraphAdapter[]
): Promise<CodeGraphNode | null> {
  const adapter = adapters.find((a) => a.supports(relPath));
  if (!adapter) return null;
  const extracted = await adapter.extract(repoRoot, relPath, content);
  return sanitizeNode(
    {
      path: relPath,
      language: detectLanguage(relPath),
      extractor: extracted.extractor,
      mtimeMs,
      sha256,
      symbols: extracted.symbols,
      imports: extracted.imports,
    },
    repoRoot
  );
}

export class DefaultCodeGraphService implements CodeGraphService {
  private readonly cache: CodeGraphCachePort;
  private readonly adapters: LanguageGraphAdapter[];

  constructor(options?: { cache?: CodeGraphCachePort; adapters?: LanguageGraphAdapter[] }) {
    this.cache = options?.cache ?? new FsCodeGraphCache();
    this.adapters = options?.adapters ?? createDefaultLanguageAdapters();
  }

  private async indexSingleFile(
    repoRoot: string,
    relPath: string,
    cachedNodes: Record<string, CodeGraphNode>
  ): Promise<CodeGraphNode | null> {
    const confinedPath = assertConfinedPath(repoRoot, relPath);
    const stat = fs.statSync(confinedPath);
    if (stat.size > MAX_FILE_BYTES) return null;
    const cached = Object.hasOwn(cachedNodes, relPath) ? cachedNodes[relPath] : undefined;
    if (cached && cached.mtimeMs === stat.mtimeMs) return cached;
    const content = fs.readFileSync(confinedPath, 'utf-8');
    const sha256 = crypto.createHash('sha256').update(content).digest('hex');
    if (cached && cached.sha256 === sha256) return { ...cached, mtimeMs: stat.mtimeMs };
    return extractWithAdapter(repoRoot, relPath, content, sha256, stat.mtimeMs, this.adapters);
  }

  async indexRepository(repoRoot: string): Promise<CodeGraphDocument> {
    const cachedDoc = await this.cache.load(repoRoot);
    const cachedNodes = cachedDoc?.nodes ?? (Object.create(null) as Record<string, CodeGraphNode>);
    const files: string[] = [];
    collectSourceFiles(repoRoot, path.resolve(repoRoot), this.adapters, files);
    const nextNodes = Object.create(null) as Record<string, CodeGraphNode>;
    for (const relPath of files) {
      const node = await this.indexSingleFile(repoRoot, relPath, cachedNodes);
      if (node) nextNodes[relPath] = node;
    }
    const doc: CodeGraphDocument = { version: '1.0', generatedAt: new Date().toISOString(), nodes: nextNodes };
    await this.cache.save(repoRoot, doc);
    return doc;
  }

  async query(repoRoot: string, target: string, depth?: number): Promise<CodeGraphQueryResult> {
    const validDepth = validateDepth(depth);
    const normTarget = validateTargetInput(repoRoot, target);
    const doc = await this.indexRepository(repoRoot);
    const startNodes = resolveStartNodes(doc, normTarget);
    if (startNodes.length === 0) {
      throw new Error(`ERR_TARGET_NOT_FOUND: Target '${target}' was not found in code graph.`);
    }
    return { target: normTarget, depth: validDepth, ...traverseKHop(doc, startNodes, validDepth) };
  }

  async queryMultiple(repoRoot: string, targets: readonly string[], depth?: number): Promise<CodeGraphQueryResult> {
    const validDepth = validateDepth(depth);
    const doc = await this.indexRepository(repoRoot);
    const allStartNodes = targets.flatMap((t) => resolveStartNodes(doc, validateTargetInput(repoRoot, t)));
    if (allStartNodes.length === 0) {
      return { target: targets.join(','), depth: validDepth, truncated: false, nodes: [], edges: [] };
    }
    return { target: targets.join(','), depth: validDepth, ...traverseKHop(doc, allStartNodes, validDepth) };
  }
}
