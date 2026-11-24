/**
 * @aisdlc/core — Rust Native Graph Adapter (cargo metadata with Untrusted Config Guard)
 */

import * as fs from 'fs';
import * as path from 'path';
import { assertConfinedPath } from '../cache/fs-code-graph-cache.js';
import type { AdapterExtractResult, LanguageGraphAdapter } from '../types.js';
import { PolyglotFallbackAdapter } from './polyglot-fallback-adapter.js';
import { buildCleanEnv, execSafeBinary, resolveTrustedBinaryPath, withEmptyTempDir } from './safe-exec-helper.js';

const RUST_PURGED_ENV = [
  'RUSTC',
  'CARGO_BUILD_RUSTC',
  'CARGO_BUILD_RUSTC_WRAPPER',
  'RUSTC_WRAPPER',
  'RUSTC_WORKSPACE_WRAPPER',
  'CARGO_HOME',
];

const IGNORED_SCAN_DIRS = new Set(['.git', 'node_modules', 'target', 'dist', 'build']);

export function hasConfigInDir(dir: string): boolean {
  const candidates = [
    path.join(dir, '.cargo', 'config'),
    path.join(dir, '.cargo', 'config.toml'),
    path.join(dir, 'rust-toolchain'),
    path.join(dir, 'rust-toolchain.toml'),
  ];
  return candidates.some((candidate) => fs.existsSync(candidate));
}

export function scanDescendantsForConfig(dir: string, depth = 0): boolean {
  if (depth > 4) return false;
  if (hasConfigInDir(dir)) return true;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return false;
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || IGNORED_SCAN_DIRS.has(entry.name)) continue;
    if (scanDescendantsForConfig(path.join(dir, entry.name), depth + 1)) return true;
  }
  return false;
}

export function hasUntrustedCargoConfig(repoRoot: string): boolean {
  if (scanDescendantsForConfig(repoRoot)) return true;
  let cursor = path.dirname(path.resolve(repoRoot));
  while (true) {
    if (hasConfigInDir(cursor)) return true;
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  return false;
}

export function parseCargoMetadataImports(stdout: string): string[] | null {
  try {
    const parsed = JSON.parse(stdout) as { packages?: Array<{ dependencies?: Array<{ name?: string }> }> };
    if (!parsed || !Array.isArray(parsed.packages)) return null;
    const deps = new Set<string>();
    for (const pkg of parsed.packages) {
      for (const dep of pkg.dependencies ?? []) {
        if (typeof dep.name === 'string') deps.add(dep.name);
      }
    }
    return [...deps];
  } catch {
    return null;
  }
}

export function runCargoMetadata(binPath: string, repoRoot: string): string[] | null {
  const res = withEmptyTempDir((emptyCargoHome) =>
    execSafeBinary(binPath, ['metadata', '--offline', '--locked', '--frozen', '--format-version', '1'], {
      cwd: repoRoot,
      env: buildCleanEnv(RUST_PURGED_ENV, { CARGO_HOME: emptyCargoHome }),
    })
  );
  return res.status === 0 && res.stdout ? parseCargoMetadataImports(res.stdout) : null;
}

export class RustGraphAdapter implements LanguageGraphAdapter {
  readonly id = 'cargo-metadata';
  private readonly fallback = new PolyglotFallbackAdapter();

  supports(relativePath: string): boolean {
    return path.extname(relativePath).toLowerCase() === '.rs';
  }

  async extract(repoRoot: string, relativePath: string, content: string): Promise<AdapterExtractResult> {
    assertConfinedPath(repoRoot, relativePath);
    const fallbackRes = await this.fallback.extract(repoRoot, relativePath, content);
    if (hasUntrustedCargoConfig(repoRoot)) return fallbackRes;
    const binPath = resolveTrustedBinaryPath('cargo', repoRoot);
    const deps = binPath ? runCargoMetadata(binPath, repoRoot) : null;
    if (!deps) return fallbackRes;
    return {
      symbols: fallbackRes.symbols,
      imports: [...new Set([...fallbackRes.imports, ...deps])],
      extractor: this.id,
    };
  }
}
