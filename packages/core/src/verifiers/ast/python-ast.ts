/**
 * AI-SDLC: Native Python AST Analyzer
 * Uses Python standard library 'ast' module (zero external dependencies).
 */

import { spawnSync } from 'child_process';
import { LanguageAstReport } from '../../types/index.js';
import { extractPythonFunctionsPolyglot } from './polyglot-scanner.js';

const PYTHON_AST_RUNNER_SCRIPT = `
import ast, json, sys

def analyze(code, filepath):
    try:
        tree = ast.parse(code)
    except Exception as e:
        return {"language": "python", "filePath": filepath, "functions": [], "error": str(e), "unsafeTypesCount": 0, "emptyStubsCount": 0}
    
    functions = []
    unsafe_types = 0
    empty_stubs = 0
    for node in ast.walk(tree):
        if isinstance(node, ast.Name) and node.id == "Any":
            unsafe_types += 1
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            start = node.lineno
            end = getattr(node, 'end_lineno', start + len(node.body))
            loc = end - start + 1
            cc = 1
            for child in ast.walk(node):
                if isinstance(child, (ast.If, ast.For, ast.AsyncFor, ast.While, ast.ExceptHandler, ast.With, ast.AsyncWith)):
                    cc += 1
                elif isinstance(child, ast.BoolOp):
                    cc += len(child.values) - 1
            
            real_body = [n for n in node.body if not (isinstance(n, ast.Expr) and isinstance(getattr(n, 'value', None), ast.Constant))]
            is_stub = len(real_body) == 0 or (len(real_body) == 1 and isinstance(real_body[0], ast.Pass))
            if is_stub:
                empty_stubs += 1
            
            code_smells = ["Empty stub detected"] if is_stub else []
            mi = max(0.0, round(100.0 - (cc * 2.0) - (loc * 0.2), 1))
            functions.append({
                "functionName": node.name,
                "filePath": filepath,
                "line": start,
                "loc": loc,
                "cyclomatic": cc,
                "cognitive": cc,
                "maintainability": mi,
                "codeSmells": code_smells
            })
    return {
        "language": "python",
        "filePath": filepath,
        "functions": functions,
        "unsafeTypesCount": unsafe_types,
        "emptyStubsCount": empty_stubs
    }

code = sys.stdin.read()
filepath = sys.argv[1] if len(sys.argv) > 1 else ""
print(json.dumps(analyze(code, filepath)))
`;

export function extractFunctionsPythonAst(content: string, filePath: string): LanguageAstReport {
  try {
    const res = spawnSync('python', ['-c', PYTHON_AST_RUNNER_SCRIPT, filePath], {
      input: content,
      encoding: 'utf-8',
      timeout: 10000,
    });
    if (res.status === 0 && res.stdout) {
      const parsed = JSON.parse(res.stdout);
      return parsed as LanguageAstReport;
    }
  } catch {
    // fallback if python execution fails
  }

  const fallbackFns = extractPythonFunctionsPolyglot(content, filePath);
  return {
    language: 'python',
    filePath,
    functions: fallbackFns,
    unsafeTypesCount: 0,
    emptyStubsCount: 0,
  };
}
