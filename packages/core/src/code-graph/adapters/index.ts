/**
 * @aisdlc/core — Language Graph Adapters Registry & Exports
 */

import type { LanguageGraphAdapter } from '../types.js';
import { CppGraphAdapter } from './cpp-graph-adapter.js';
import { GoGraphAdapter } from './go-graph-adapter.js';
import { PolyglotFallbackAdapter } from './polyglot-fallback-adapter.js';
import { PythonGraphAdapter } from './python-graph-adapter.js';
import { RustGraphAdapter } from './rust-graph-adapter.js';
import { TypeScriptGraphAdapter } from './typescript-graph-adapter.js';

export {
  buildCleanEnv,
  execSafeBinary,
  resolveTrustedBinaryPath,
  withEmptyTempDir,
} from './safe-exec-helper.js';
export { TypeScriptGraphAdapter } from './typescript-graph-adapter.js';
export { PythonGraphAdapter } from './python-graph-adapter.js';
export { GoGraphAdapter } from './go-graph-adapter.js';
export { RustGraphAdapter } from './rust-graph-adapter.js';
export { CppGraphAdapter } from './cpp-graph-adapter.js';
export { PolyglotFallbackAdapter } from './polyglot-fallback-adapter.js';

export function createDefaultLanguageAdapters(): LanguageGraphAdapter[] {
  return [
    new TypeScriptGraphAdapter(),
    new PythonGraphAdapter(),
    new GoGraphAdapter(),
    new RustGraphAdapter(),
    new CppGraphAdapter(),
    new PolyglotFallbackAdapter(),
  ];
}
