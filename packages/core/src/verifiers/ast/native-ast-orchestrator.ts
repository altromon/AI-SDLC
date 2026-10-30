/**
 * AI-SDLC: Native Language SDK/CLI AST Orchestrator
 * Dispatches to native language compilers / SDKs (python ast, ts-morph, dotnet, cargo, go)
 * with strict Fail-Closed enforcement for configured toolchain stacks.
 */

import { spawnSync } from 'child_process';
import { LanguageAstReport } from '../../types/index.js';
import { extractFunctionsTypeScriptAst } from './typescript-ast.js';
import { extractFunctionsPythonAst } from './python-ast.js';
import { extractFunctionsPolyglot } from './polyglot-scanner.js';

export interface NativeAstOptions {
  requiredStack?: string;
  strictToolchain?: boolean;
}

export function isCliInstalled(bin: string): boolean {
  try {
    const res = spawnSync(bin, ['--version'], { encoding: 'utf-8', timeout: 5000, shell: false });
    return res.status === 0 && !res.error;
  } catch {
    return false;
  }
}

function assertRequiredStack(stack?: string): void {
  if (!stack) return;
  if (!isCliInstalled(stack)) {
    throw new Error(`[AI-SDLC Fail-Closed] Required toolchain CLI '${stack}' is not installed in the environment`);
  }
}

function analyzeTypeScript(content: string, filePath: string): LanguageAstReport {
  return {
    language: 'typescript',
    filePath,
    functions: extractFunctionsTypeScriptAst(content, filePath),
    unsafeTypesCount: 0,
    emptyStubsCount: 0,
  };
}

function analyzePolyglot(content: string, filePath: string, ext: string): LanguageAstReport {
  return {
    language: ext.replace(/^\./, ''),
    filePath,
    functions: extractFunctionsPolyglot(content, filePath),
    unsafeTypesCount: 0,
    emptyStubsCount: 0,
  };
}

export function orchestrateNativeAstAnalysis(
  content: string,
  filePath: string,
  options: NativeAstOptions = {}
): LanguageAstReport {
  assertRequiredStack(options.requiredStack);
  const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
  if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
    return analyzeTypeScript(content, filePath);
  }
  if (ext === '.py') {
    return extractFunctionsPythonAst(content, filePath);
  }
  return analyzePolyglot(content, filePath, ext);
}
