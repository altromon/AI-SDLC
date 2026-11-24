/**
 * @aisdlc/core — Safe Subprocess Execution Helper (SEC-REQ-065-CODE-GRAPH-SAFE-EXEC-001)
 */

import * as child_process from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const MAX_EXEC_TIMEOUT_MS = 10_000;
const MAX_EXEC_BUFFER_BYTES = 5 * 1024 * 1024;

export function isInsideOrEqual(baseDir: string, candidateDir: string): boolean {
  const rel = path.relative(baseDir, candidateDir);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

export function isTrustedPathEntry(entry: string, resolvedRoot: string, resolvedCwd: string): boolean {
  if (!entry || entry === '.' || entry === '..' || !path.isAbsolute(entry)) {
    return false;
  }
  const resolvedEntry = path.resolve(entry);
  if (resolvedEntry === resolvedCwd || isInsideOrEqual(resolvedRoot, resolvedEntry)) {
    return false;
  }
  return true;
}

export function findBinaryInDir(dir: string, binaryName: string): string | null {
  const candidates =
    process.platform === 'win32' && !path.extname(binaryName)
      ? [`${binaryName}.exe`, `${binaryName}.cmd`, binaryName]
      : [binaryName];

  for (const name of candidates) {
    const fullPath = path.join(dir, name);
    try {
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        return fullPath;
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function resolveTrustedBinaryPath(binaryName: string, repoRoot: string): string | null {
  const rawPath = process.env.PATH || '';
  const resolvedRoot = path.resolve(repoRoot);
  const resolvedCwd = path.resolve(process.cwd());

  for (const entry of rawPath.split(path.delimiter)) {
    if (!isTrustedPathEntry(entry, resolvedRoot, resolvedCwd)) continue;
    const found = findBinaryInDir(path.resolve(entry), binaryName);
    if (found) return found;
  }
  return null;
}

export function buildCleanEnv(
  purgedKeys: readonly string[],
  extra: Record<string, string> = {}
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const key of purgedKeys) {
    delete env[key];
  }
  return { ...env, ...extra };
}

export function execSafeBinary(
  binPath: string,
  args: readonly string[],
  options: { cwd: string; env: NodeJS.ProcessEnv; input?: string; timeoutMs?: number }
): child_process.SpawnSyncReturns<string> {
  return child_process.spawnSync(binPath, [...args], {
    shell: false,
    cwd: options.cwd,
    env: options.env,
    input: options.input,
    encoding: 'utf-8',
    timeout: Math.min(options.timeoutMs ?? MAX_EXEC_TIMEOUT_MS, MAX_EXEC_TIMEOUT_MS),
    maxBuffer: MAX_EXEC_BUFFER_BYTES,
  });
}

export function withEmptyTempDir<T>(fn: (tempDir: string) => T): T {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-safe-exec-'));
  try {
    return fn(tempDir);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
}
