/**
 * @aisdlc/core — C/C++ Native Graph Adapter (Data-Only compile_commands.json + Confined clang -MM)
 */

import * as fs from 'fs';
import * as path from 'path';
import { assertConfinedPath } from '../cache/fs-code-graph-cache.js';
import type { AdapterExtractResult, LanguageGraphAdapter } from '../types.js';
import { PolyglotFallbackAdapter } from './polyglot-fallback-adapter.js';
import { buildCleanEnv, execSafeBinary, resolveTrustedBinaryPath } from './safe-exec-helper.js';

const CPP_EXTENSIONS = new Set(['.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.hh']);

function rejectLeadingFlagOrResponseFile(target: string): void {
  const normalized = target.trim();
  const base = path.basename(normalized);
  if (normalized.startsWith('-') || normalized.startsWith('@') || base.startsWith('-') || base.startsWith('@')) {
    throw new Error(`ERR_INVALID_TARGET: Leading '-' or '@' rejected for '${target}'.`);
  }
}

function tokenizeCommand(cmd: string): string[] {
  return cmd.match(/"[^"]*"|'[^']*'|\S+/g)?.map((t) => t.replace(/^["']|["']$/g, '')) ?? [];
}

function tryConfineIncludeDir(repoRoot: string, rawDir: string): string | null {
  try {
    return assertConfinedPath(repoRoot, rawDir);
  } catch {
    return null;
  }
}

function collectIncludeArgsFromTokens(tokens: string[], repoRoot: string, args: string[]): void {
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if ((tok === '-I' || tok === '-isystem') && i + 1 < tokens.length) {
      const confined = tryConfineIncludeDir(repoRoot, tokens[++i]);
      if (confined) args.push(tok, confined);
      continue;
    }
    if (tok.startsWith('-I') && tok.length > 2) {
      const confined = tryConfineIncludeDir(repoRoot, tok.slice(2));
      if (confined) args.push(`-I${confined}`);
    }
  }
}

function extractSafeIncludeArgs(repoRoot: string): string[] {
  const ccPath = path.join(repoRoot, 'compile_commands.json');
  if (!fs.existsSync(ccPath)) return [];
  try {
    const entries = JSON.parse(fs.readFileSync(ccPath, 'utf-8')) as Array<{ command?: string; arguments?: string[] }>;
    if (!Array.isArray(entries)) return [];
    const args: string[] = [];
    for (const entry of entries) {
      const tokens = Array.isArray(entry.arguments)
        ? entry.arguments
        : typeof entry.command === 'string'
          ? tokenizeCommand(entry.command)
          : [];
      collectIncludeArgsFromTokens(tokens, repoRoot, args);
    }
    return args;
  } catch {
    return [];
  }
}

function parseConfinedClangDeps(stdout: string, repoRoot: string, selfRelPath: string): string[] {
  const cleaned = stdout.replace(/\\\r?\n/g, ' ');
  const colonIdx = cleaned.indexOf(':');
  const rhs = colonIdx >= 0 ? cleaned.slice(colonIdx + 1) : cleaned;
  const realRoot = fs.realpathSync(path.resolve(repoRoot));
  const selfNorm = selfRelPath.replace(/\\/g, '/');
  const deps = new Set<string>();

  for (const token of rhs.trim().split(/\s+/)) {
    if (!token) continue;
    try {
      const confined = assertConfinedPath(repoRoot, token);
      const rel = path.relative(realRoot, confined).replace(/\\/g, '/');
      if (rel && rel !== selfNorm) deps.add(rel);
    } catch {
      continue;
    }
  }
  return [...deps];
}

export class CppGraphAdapter implements LanguageGraphAdapter {
  readonly id = 'clang-mm';
  private readonly fallback = new PolyglotFallbackAdapter();

  supports(relativePath: string): boolean {
    return CPP_EXTENSIONS.has(path.extname(relativePath).toLowerCase());
  }

  async extract(repoRoot: string, relativePath: string, content: string): Promise<AdapterExtractResult> {
    rejectLeadingFlagOrResponseFile(relativePath);
    const confinedPath = assertConfinedPath(repoRoot, relativePath);
    const binPath = resolveTrustedBinaryPath('clang', repoRoot) ?? resolveTrustedBinaryPath('clang++', repoRoot);
    if (!binPath) {
      return this.fallback.extract(repoRoot, relativePath, content);
    }
    const includeArgs = extractSafeIncludeArgs(repoRoot);
    const res = execSafeBinary(binPath, ['-MM', ...includeArgs, '--', confinedPath], {
      cwd: repoRoot,
      env: buildCleanEnv([]),
    });
    if (res.status !== 0 || !res.stdout) {
      return this.fallback.extract(repoRoot, relativePath, content);
    }
    const fallbackRes = await this.fallback.extract(repoRoot, relativePath, content);
    return {
      symbols: fallbackRes.symbols,
      imports: parseConfinedClangDeps(res.stdout, repoRoot, relativePath),
      extractor: this.id,
    };
  }
}
