/**
 * @aisdlc/core — Go Native Graph Adapter (go list -json with Isolated Env Vars)
 */

import * as path from 'path';
import { assertConfinedPath } from '../cache/fs-code-graph-cache.js';
import type { AdapterExtractResult, LanguageGraphAdapter } from '../types.js';
import { PolyglotFallbackAdapter } from './polyglot-fallback-adapter.js';
import { buildCleanEnv, execSafeBinary, resolveTrustedBinaryPath } from './safe-exec-helper.js';

export function parseGoListImports(stdout: string): string[] | null {
  try {
    const parsed = JSON.parse(stdout) as { Imports?: unknown };
    if (!parsed || !Array.isArray(parsed.Imports)) return null;
    return parsed.Imports.filter((item): item is string => typeof item === 'string');
  } catch {
    return null;
  }
}

export function runGoList(binPath: string, confinedPath: string): string[] | null {
  const env = buildCleanEnv([], {
    GOFLAGS: '-mod=readonly',
    GOPROXY: 'off',
    GOTOOLCHAIN: 'local',
    GOWORK: 'off',
  });
  const res = execSafeBinary(binPath, ['list', '-json', '--', confinedPath], {
    cwd: path.dirname(confinedPath),
    env,
  });
  return res.status === 0 && res.stdout ? parseGoListImports(res.stdout) : null;
}

export class GoGraphAdapter implements LanguageGraphAdapter {
  readonly id = 'go-list';
  private readonly fallback = new PolyglotFallbackAdapter();

  supports(relativePath: string): boolean {
    return path.extname(relativePath).toLowerCase() === '.go';
  }

  async extract(repoRoot: string, relativePath: string, content: string): Promise<AdapterExtractResult> {
    const confinedPath = assertConfinedPath(repoRoot, relativePath);
    const binPath = resolveTrustedBinaryPath('go', repoRoot);
    const imports = binPath ? runGoList(binPath, confinedPath) : null;
    const fallbackRes = await this.fallback.extract(repoRoot, relativePath, content);
    if (!imports) return fallbackRes;
    return { symbols: fallbackRes.symbols, imports, extractor: this.id };
  }
}
