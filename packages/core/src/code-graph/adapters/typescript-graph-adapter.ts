/**
 * @aisdlc/core — TypeScript/JavaScript Native AST Graph Adapter
 */

import * as path from 'path';
import type { SourceFile } from 'ts-morph';
import { getSharedProject } from '../../verifiers/ast/typescript-ast.js';
import {
  CODE_GRAPH_LIMITS,
  type AdapterExtractResult,
  type LanguageGraphAdapter,
  type SymbolKind,
  type SymbolSignature,
} from '../types.js';

const TS_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts']);

export function headerOnly(text: string): string {
  const firstLine = text.split('\n')[0] || '';
  return firstLine.replace(/\{[\s\S]*$/, '').trim().slice(0, CODE_GRAPH_LIMITS.MAX_SIGNATURE_CHARS);
}

export function pushSymbol(
  list: SymbolSignature[],
  name: string | undefined,
  kind: SymbolKind,
  signature: string,
  exported: boolean
): void {
  if (!name || list.length >= CODE_GRAPH_LIMITS.MAX_SYMBOLS_PER_NODE) return;
  list.push({ name, kind, signature: headerOnly(signature), exported });
}

export function extractTsImports(sourceFile: SourceFile): string[] {
  const imports = new Set<string>();
  for (const imp of sourceFile.getImportDeclarations()) {
    imports.add(imp.getModuleSpecifierValue());
  }
  for (const exp of sourceFile.getExportDeclarations()) {
    const mod = exp.getModuleSpecifierValue();
    if (mod) imports.add(mod);
  }
  return [...imports];
}

export function collectExportedConsts(sourceFile: SourceFile, symbols: SymbolSignature[]): void {
  for (const varStmt of sourceFile.getVariableStatements()) {
    if (!varStmt.isExported()) continue;
    for (const decl of varStmt.getDeclarations()) {
      pushSymbol(symbols, decl.getName(), 'const', `export const ${decl.getName()}`, true);
    }
  }
}

export function extractTsSymbols(sourceFile: SourceFile): SymbolSignature[] {
  const symbols: SymbolSignature[] = [];
  for (const fn of sourceFile.getFunctions()) pushSymbol(symbols, fn.getName(), 'function', fn.getText(), fn.isExported());
  for (const cls of sourceFile.getClasses()) pushSymbol(symbols, cls.getName(), 'class', cls.getText(), cls.isExported());
  for (const iface of sourceFile.getInterfaces()) pushSymbol(symbols, iface.getName(), 'interface', iface.getText(), iface.isExported());
  for (const alias of sourceFile.getTypeAliases()) pushSymbol(symbols, alias.getName(), 'type', alias.getText(), alias.isExported());
  for (const en of sourceFile.getEnums()) pushSymbol(symbols, en.getName(), 'enum', en.getText(), en.isExported());
  collectExportedConsts(sourceFile, symbols);
  return symbols;
}

export class TypeScriptGraphAdapter implements LanguageGraphAdapter {
  readonly id = 'typescript-ast';

  supports(relativePath: string): boolean {
    return TS_EXTENSIONS.has(path.extname(relativePath).toLowerCase());
  }

  async extract(_repoRoot: string, relativePath: string, content: string): Promise<AdapterExtractResult> {
    const project = getSharedProject();
    const virtualPath = `__cg_${Date.now()}_${path.basename(relativePath)}`;
    const sourceFile = project.createSourceFile(virtualPath, content, { overwrite: true });
    try {
      return { symbols: extractTsSymbols(sourceFile), imports: extractTsImports(sourceFile), extractor: this.id };
    } finally {
      project.removeSourceFile(sourceFile);
    }
  }
}
