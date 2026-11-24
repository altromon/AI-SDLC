/**
 * @aisdlc/core — Polyglot Fallback Language Graph Adapter
 */

import * as path from 'path';
import { extractFunctionsPolyglot } from '../../verifiers/ast/polyglot-scanner.js';
import {
  CODE_GRAPH_LIMITS,
  type AdapterExtractResult,
  type LanguageGraphAdapter,
  type SymbolKind,
  type SymbolSignature,
} from '../types.js';

const SUPPORTED_EXTENSIONS = new Set([
  '.java', '.cs', '.py', '.pyi', '.go', '.rs',
  '.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.hh',
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
]);

const TYPE_DECL_REGEX =
  /^\s*(?:export\s+|public\s+|private\s+|protected\s+|internal\s+|pub\s+)?(class|interface|struct|enum|trait|type)\s+([A-Za-z_][A-Za-z0-9_]*)/;

const IMPORT_PATTERNS: readonly RegExp[] = [
  /^\s*import\s+(?:static\s+)?([A-Za-z0-9_.*]+)\s*;/,
  /^\s*using\s+([A-Za-z0-9_.]+)\s*;/,
  /^\s*#include\s+"([^"]+)"/,
  /^\s*use\s+([A-Za-z0-9_:]+)\s*;/,
  /^\s*(?:from|import)\s+([A-Za-z0-9_.]+)/,
];

export function extractTypeSymbols(content: string): SymbolSignature[] {
  const symbols: SymbolSignature[] = [];
  for (const line of content.split('\n')) {
    const match = line.match(TYPE_DECL_REGEX);
    if (!match) continue;
    const rawKind = match[1];
    const kind: SymbolKind = rawKind === 'interface' || rawKind === 'trait'
      ? 'interface'
      : rawKind === 'enum' ? 'enum' : rawKind === 'type' ? 'type' : 'class';
    symbols.push({
      name: match[2],
      kind,
      signature: line.trim().replace(/\{.*$/, '').trim().slice(0, CODE_GRAPH_LIMITS.MAX_SIGNATURE_CHARS),
      exported: /\b(?:export|public|pub)\b/.test(line),
    });
  }
  return symbols;
}

export function extractPolyglotImports(content: string): string[] {
  const imports = new Set<string>();
  for (const line of content.split('\n')) {
    for (const pattern of IMPORT_PATTERNS) {
      const match = line.match(pattern);
      if (match?.[1]) {
        imports.add(match[1]);
        break;
      }
    }
  }
  return [...imports];
}

export function mergePolyglotSymbols(typeSymbols: SymbolSignature[], fnSymbols: SymbolSignature[]): SymbolSignature[] {
  const seen = new Set<string>();
  const combined: SymbolSignature[] = [];
  for (const sym of [...typeSymbols, ...fnSymbols]) {
    if (seen.has(sym.name)) continue;
    seen.add(sym.name);
    combined.push(sym);
    if (combined.length >= CODE_GRAPH_LIMITS.MAX_SYMBOLS_PER_NODE) break;
  }
  return combined;
}

export class PolyglotFallbackAdapter implements LanguageGraphAdapter {
  readonly id = 'polyglot-scanner';

  supports(relativePath: string): boolean {
    return SUPPORTED_EXTENSIONS.has(path.extname(relativePath).toLowerCase());
  }

  async extract(_repoRoot: string, relativePath: string, content: string): Promise<AdapterExtractResult> {
    const fnMetrics = extractFunctionsPolyglot(content, relativePath);
    const fnSymbols: SymbolSignature[] = fnMetrics
      .filter((fn) => Boolean(fn.functionName) && fn.functionName !== 'main_module')
      .map((fn) => ({ name: fn.functionName, kind: 'function', signature: `function ${fn.functionName}()`, exported: true }));
    return {
      symbols: mergePolyglotSymbols(extractTypeSymbols(content), fnSymbols),
      imports: extractPolyglotImports(content),
      extractor: this.id,
    };
  }
}
