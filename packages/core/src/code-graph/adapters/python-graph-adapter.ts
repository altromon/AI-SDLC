/**
 * @aisdlc/core — Python Native AST Graph Adapter (Isolated -I -P + Empty Temp CWD)
 */

import * as path from 'path';
import { assertConfinedPath } from '../cache/fs-code-graph-cache.js';
import type { AdapterExtractResult, LanguageGraphAdapter, SymbolSignature } from '../types.js';
import { PolyglotFallbackAdapter } from './polyglot-fallback-adapter.js';
import { buildCleanEnv, execSafeBinary, resolveTrustedBinaryPath, withEmptyTempDir } from './safe-exec-helper.js';

const PYTHON_EXTENSIONS = new Set(['.py', '.pyi']);
const PYTHON_PURGED_ENV = ['PYTHONPATH', 'PYTHONSTARTUP', 'PYTHONHOME'];

const PYTHON_AST_SCRIPT = [
  'import ast, json, sys',
  'tree = ast.parse(sys.stdin.read())',
  'symbols, imports = [], []',
  'for node in tree.body:',
  '    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):',
  '        symbols.append({"name": node.name, "kind": "function", "signature": f"def {node.name}(...)", "exported": not node.name.startswith("_")})',
  '    elif isinstance(node, ast.ClassDef):',
  '        symbols.append({"name": node.name, "kind": "class", "signature": f"class {node.name}", "exported": not node.name.startswith("_")})',
  '    elif isinstance(node, ast.Import):',
  '        imports.extend(a.name for a in node.names)',
  '    elif isinstance(node, ast.ImportFrom) and node.module:',
  '        imports.append(node.module)',
  'print(json.dumps({"symbols": symbols, "imports": imports}))',
].join('\n');

function parsePythonAstOutput(stdout: string): { symbols: SymbolSignature[]; imports: string[] } | null {
  try {
    const parsed = JSON.parse(stdout) as { symbols?: SymbolSignature[]; imports?: string[] };
    if (!parsed || !Array.isArray(parsed.symbols) || !Array.isArray(parsed.imports)) return null;
    return { symbols: parsed.symbols, imports: parsed.imports };
  } catch {
    return null;
  }
}

export class PythonGraphAdapter implements LanguageGraphAdapter {
  readonly id = 'python-ast';
  private readonly fallback = new PolyglotFallbackAdapter();

  supports(relativePath: string): boolean {
    return PYTHON_EXTENSIONS.has(path.extname(relativePath).toLowerCase());
  }

  async extract(repoRoot: string, relativePath: string, content: string): Promise<AdapterExtractResult> {
    assertConfinedPath(repoRoot, relativePath);
    const binPath =
      resolveTrustedBinaryPath('python3', repoRoot) ?? resolveTrustedBinaryPath('python', repoRoot);
    if (!binPath) {
      return this.fallback.extract(repoRoot, relativePath, content);
    }
    const env = buildCleanEnv(PYTHON_PURGED_ENV, {
      PYTHONSAFEPATH: '1',
      PYTHONNOUSERSITE: '1',
    });
    const res = withEmptyTempDir((emptyCwd) =>
      execSafeBinary(binPath, ['-I', '-P', '-c', PYTHON_AST_SCRIPT], { cwd: emptyCwd, env, input: content })
    );
    if (res.status !== 0 || !res.stdout) {
      return this.fallback.extract(repoRoot, relativePath, content);
    }
    const parsed = parsePythonAstOutput(res.stdout);
    if (!parsed) {
      return this.fallback.extract(repoRoot, relativePath, content);
    }
    return { symbols: parsed.symbols, imports: parsed.imports, extractor: this.id };
  }
}
