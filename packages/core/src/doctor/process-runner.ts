/**
 * AI-SDLC: Safe Process Runner Adapter (SEC-REQ-052-SAFE-TOOLCHAIN-PROBE-001)
 */

import { execFile, spawnSync } from 'node:child_process';
import * as path from 'node:path';
import {
  IProcessRunner,
  ProcessExecOptions,
  ProcessExecResult,
  SafeProbeExecutable,
} from '../types/doctor.js';
import { resolveTrustedBinaryPath, resolveWinCmdSpawn } from '../verifiers/tool-installer.js';

const ALLOWED_TOOLS = new Set<string>(['node', 'pnpm', 'git', 'semgrep', 'trivy', 'gitleaks']);
const DANGEROUS_KEYS = ['NODE_OPTIONS', 'NODE_PATH', 'LD_PRELOAD', 'DYLD_INSERT_LIBRARIES', 'GIT_EXEC_PATH'];
const SAFE_KEYS = ['PATH', 'Path', 'SYSTEMROOT', 'SystemRoot', 'TMP', 'TEMP', 'HOME', 'USERPROFILE', 'ComSpec', 'COMSPEC'];

export function normalizePathKey(target: string): string {
  const resolved = path.resolve(target);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

export function sanitizePathValue(rawPath: string, cwd?: string): string {
  const normalizedCwd = cwd ? normalizePathKey(cwd) : undefined;
  return rawPath
    .split(path.delimiter)
    .filter((entry) => {
      const trimmed = entry.trim();
      if (!trimmed || trimmed === '.' || trimmed === './' || trimmed === '.\\') return false;
      if (!path.isAbsolute(trimmed)) return false;
      return !normalizedCwd || normalizePathKey(trimmed) !== normalizedCwd;
    })
    .join(path.delimiter);
}

export function buildSafeEnvironment(cwd?: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const k of SAFE_KEYS) {
    if (process.env[k] !== undefined) env[k] = process.env[k];
  }
  for (const d of DANGEROUS_KEYS) delete env[d];
  if (env.PATH !== undefined) env.PATH = sanitizePathValue(env.PATH, cwd);
  if (env.Path !== undefined) env.Path = sanitizePathValue(env.Path, cwd);
  env.SEMGREP_ENABLE_VERSION_CHECK = '0';
  env.SEMGREP_SEND_METRICS = 'off';
  return env;
}

export function truncateBuffer(output: unknown, limit: number): string {
  const text = typeof output === 'string' ? output : (output ? String(output) : '');
  return text.length > limit ? text.slice(0, limit) : text;
}

export function resolveExitCode(error: unknown): number | null {
  if (!error) return 0;
  const err = error as { killed?: boolean; code?: number };
  return err.killed ? null : (typeof err.code === 'number' ? err.code : 1);
}

export function runSpawn(
  file: string,
  args: string[],
  cwd: string,
  timeout: number,
  maxBuffer: number
): Promise<ProcessExecResult> {
  return new Promise<ProcessExecResult>((resolve) => {
    const opts = { shell: false, timeout, maxBuffer, cwd, env: buildSafeEnvironment(cwd), windowsHide: true };
    const child = execFile(file, args, opts, (err, stdout, stderr) => {
      if ((err as { killed?: boolean } | null)?.killed && child?.pid && process.platform === 'win32') {
        spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
      }
      resolve({ stdout: truncateBuffer(stdout, maxBuffer), stderr: truncateBuffer(stderr, maxBuffer), exitCode: resolveExitCode(err) });
    });
  });
}

export class SafeProcessRunnerAdapter implements IProcessRunner {
  public async execSafe(
    executable: SafeProbeExecutable,
    args: string[],
    options: ProcessExecOptions = {}
  ): Promise<ProcessExecResult> {
    if (!ALLOWED_TOOLS.has(executable)) {
      throw new Error(`ERR_UNAUTHORIZED_PROBE_TOOL: Executable '${executable}' is not authorized.`);
    }

    const cwd = options.cwd ?? process.cwd();
    const trustedPath = resolveTrustedBinaryPath(executable, cwd);
    if (!trustedPath) {
      throw new Error(`ERR_UNTRUSTED_OR_MISSING_BINARY: Executable '${executable}' was not found on trusted PATH.`);
    }

    const timeout = Math.min(options.timeout ?? 2000, 2000);
    const maxBuffer = options.maxBuffer ?? 1024;
    const resolved = resolveWinCmdSpawn(trustedPath, args);
    if (resolved.rejectedMetachar) {
      throw new Error('ERR_UNSAFE_WIN_BATCH_ARGS: Rejected unsafe shell metacharacter in Windows batch arguments.');
    }

    return runSpawn(resolved.command, resolved.args, cwd, timeout, maxBuffer);
  }
}
