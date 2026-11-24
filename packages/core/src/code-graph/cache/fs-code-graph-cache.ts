/**
 * @aisdlc/core — File-System Code Graph Cache with FS-Jail, CWE-1321 Defense,
 * Windows-safe Atomic Rename, and PII/Secret/Host-Path Redaction.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { createDefaultDlpPolicy, sanitizeDlpText } from '../../security/dlp-sanitizer.js';
import {
  CODE_GRAPH_LIMITS,
  type CodeGraphCachePort,
  type CodeGraphDocument,
  type CodeGraphNode,
  type SymbolSignature,
} from '../types.js';

const FORBIDDEN_PROTO_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const RETRYABLE_RENAME_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

function isOutsideBase(basePath: string, candidatePath: string): boolean {
  const rel = path.relative(basePath, candidatePath);
  return rel === '..' || rel.startsWith(`..${path.sep}`) || rel.startsWith('../') || path.isAbsolute(rel);
}

function resolveNearestRealPath(targetPath: string): { realBase: string; tail: string[] } {
  let cursor = targetPath;
  const tail: string[] = [];
  while (!fs.existsSync(cursor)) {
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    tail.unshift(path.basename(cursor));
    cursor = parent;
  }
  const realBase = fs.existsSync(cursor) ? fs.realpathSync(cursor) : cursor;
  return { realBase, tail };
}

export function assertConfinedPath(repoRoot: string, target: string): string {
  if (!target || target.includes('\0')) {
    throw new Error('ERR_PATH_TRAVERSAL_DETECTED: Null byte or empty path rejected.');
  }
  const normalizedInput = target.replace(/\\/g, '/');
  if (/(?:^|\/)\.\.(?:\/|$)/.test(normalizedInput)) {
    throw new Error(`ERR_PATH_TRAVERSAL_DETECTED: Traversal segment rejected for '${target}'.`);
  }
  const resolvedRoot = path.resolve(repoRoot);
  const resolvedTarget = path.resolve(resolvedRoot, normalizedInput);
  if (isOutsideBase(resolvedRoot, resolvedTarget)) {
    throw new Error(`ERR_PATH_TRAVERSAL_DETECTED: Path '${target}' escapes repository root.`);
  }
  const realRoot = fs.existsSync(resolvedRoot) ? fs.realpathSync(resolvedRoot) : resolvedRoot;
  const { realBase, tail } = resolveNearestRealPath(resolvedTarget);
  if (isOutsideBase(realRoot, realBase)) {
    throw new Error(`ERR_SYMLINK_ESCAPE_DETECTED: Symlink/junction '${target}' escapes repository root.`);
  }
  return tail.length > 0 ? path.join(realBase, ...tail) : realBase;
}

export function redactSensitiveText(text: string, repoRoot: string): string {
  let result = text;
  const candidates = new Set<string>([
    repoRoot,
    path.resolve(repoRoot),
    repoRoot.replace(/\\/g, '/'),
    path.resolve(repoRoot).replace(/\\/g, '/'),
  ]);
  for (const rootCandidate of candidates) {
    if (rootCandidate.length > 1) {
      result = result.split(rootCandidate).join('<repoRoot>');
    }
  }
  result = sanitizeDlpText(result, createDefaultDlpPolicy()).sanitizedText;
  return result.replace(EMAIL_PATTERN, '[REDACTED:EMAIL]');
}

function sanitizeSymbols(symbols: readonly SymbolSignature[], repoRoot: string): SymbolSignature[] {
  return symbols.slice(0, CODE_GRAPH_LIMITS.MAX_SYMBOLS_PER_NODE).map((sym) => ({
    name: redactSensitiveText(sym.name, repoRoot),
    kind: sym.kind,
    signature: redactSensitiveText(sym.signature, repoRoot).slice(0, CODE_GRAPH_LIMITS.MAX_SIGNATURE_CHARS),
    exported: Boolean(sym.exported),
  }));
}

function sanitizeNode(node: CodeGraphNode, repoRoot: string): CodeGraphNode {
  return {
    path: node.path.replace(/\\/g, '/'),
    language: node.language,
    extractor: node.extractor,
    mtimeMs: Number(node.mtimeMs) || 0,
    sha256: String(node.sha256 || ''),
    symbols: sanitizeSymbols(node.symbols || [], repoRoot),
    imports: (node.imports || []).map((imp) => redactSensitiveText(imp, repoRoot)),
  };
}

function tryParseSafeNode(candidate: unknown, repoRoot: string): CodeGraphNode | null {
  if (!candidate || typeof candidate !== 'object') return null;
  const node = candidate as CodeGraphNode;
  if (typeof node.path !== 'string' || path.isAbsolute(node.path)) return null;
  try {
    assertConfinedPath(repoRoot, node.path);
    return sanitizeNode(node, repoRoot);
  } catch {
    return null;
  }
}

function parseSafeNodes(rawNodes: unknown, repoRoot: string): Record<string, CodeGraphNode> {
  const safeNodes = Object.create(null) as Record<string, CodeGraphNode>;
  if (!rawNodes || typeof rawNodes !== 'object') return safeNodes;
  const record = rawNodes as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (FORBIDDEN_PROTO_KEYS.has(key) || !Object.hasOwn(record, key)) continue;
    const parsed = tryParseSafeNode(record[key], repoRoot);
    if (parsed) safeNodes[key] = parsed;
  }
  return safeNodes;
}

function sleepSync(ms: number): void {
  const sab = new SharedArrayBuffer(4);
  const view = new Int32Array(sab);
  Atomics.wait(view, 0, 0, ms);
}

function renameWithRetry(tmpPath: string, finalPath: string): void {
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      fs.renameSync(tmpPath, finalPath);
      return;
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException)?.code ?? '';
      if (!RETRYABLE_RENAME_CODES.has(code) || attempt === maxAttempts) {
        throw err;
      }
      sleepSync(20 * attempt);
    }
  }
}

export class FsCodeGraphCache implements CodeGraphCachePort {
  async load(repoRoot: string): Promise<CodeGraphDocument | null> {
    const cacheFile = assertConfinedPath(repoRoot, '.aisdlc/cache/code-graph.json');
    if (!fs.existsSync(cacheFile)) return null;
    try {
      const raw = JSON.parse(fs.readFileSync(cacheFile, 'utf-8')) as Record<string, unknown>;
      if (!raw || raw.version !== '1.0' || !raw.nodes || typeof raw.nodes !== 'object') {
        return null;
      }
      return {
        version: '1.0',
        generatedAt: typeof raw.generatedAt === 'string' ? raw.generatedAt : new Date(0).toISOString(),
        nodes: parseSafeNodes(raw.nodes, repoRoot),
      };
    } catch {
      return null;
    }
  }

  async save(repoRoot: string, doc: CodeGraphDocument): Promise<void> {
    const cacheDir = assertConfinedPath(repoRoot, '.aisdlc/cache');
    fs.mkdirSync(cacheDir, { recursive: true });
    const finalPath = assertConfinedPath(repoRoot, '.aisdlc/cache/code-graph.json');
    const tmpPath = path.join(cacheDir, `code-graph.json.${process.pid}.${crypto.randomUUID()}.tmp`);
    const safeDoc: CodeGraphDocument = {
      version: '1.0',
      generatedAt: doc.generatedAt,
      nodes: parseSafeNodes(doc.nodes, repoRoot),
    };
    try {
      fs.writeFileSync(tmpPath, JSON.stringify(safeDoc, null, 2), 'utf-8');
      renameWithRetry(tmpPath, finalPath);
    } catch (err) {
      if (fs.existsSync(tmpPath)) {
        fs.rmSync(tmpPath, { force: true });
      }
      throw err;
    }
  }
}
