/**
 * AI-SDLC: Safe Process Runner Adapter (SEC-REQ-052-SAFE-TOOLCHAIN-PROBE-001)
 */

import { execFile } from 'node:child_process';
import { IProcessRunner, ProcessExecOptions, ProcessExecResult } from '../types/doctor.js';

const ALLOWED_TOOLS = new Set<string>(['node', 'pnpm', 'git']);
const DANGEROUS_KEYS = ['NODE_OPTIONS', 'NODE_PATH', 'LD_PRELOAD', 'DYLD_INSERT_LIBRARIES', 'GIT_EXEC_PATH'];
const SAFE_KEYS = ['PATH', 'Path', 'SYSTEMROOT', 'SystemRoot', 'TMP', 'TEMP', 'HOME', 'USERPROFILE'];

export function buildSafeEnvironment(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const k of SAFE_KEYS) {
    if (process.env[k] !== undefined) env[k] = process.env[k];
  }
  for (const d of DANGEROUS_KEYS) delete env[d];
  return env;
}

function truncateBuffer(output: unknown, limit: number): string {
  const text = typeof output === 'string' ? output : (output ? String(output) : '');
  return text.length > limit ? text.slice(0, limit) : text;
}

function resolveExitCode(error: unknown): number | null {
  if (!error) return 0;
  const err = error as { killed?: boolean; code?: number };
  return err.killed ? null : (typeof err.code === 'number' ? err.code : 1);
}

function runSpawn(
  executable: string,
  args: string[],
  cwd: string,
  timeout: number,
  maxBuffer: number
): Promise<ProcessExecResult> {
  return new Promise<ProcessExecResult>((resolve) => {
    execFile(
      executable,
      args,
      { shell: false, timeout, maxBuffer, cwd, env: buildSafeEnvironment(), windowsHide: true },
      (err, stdout, stderr) => {
        resolve({
          stdout: truncateBuffer(stdout, maxBuffer),
          stderr: truncateBuffer(stderr, maxBuffer),
          exitCode: resolveExitCode(err),
        });
      }
    );
  });
}

export class SafeProcessRunnerAdapter implements IProcessRunner {
  public async execSafe(
    executable: 'node' | 'pnpm' | 'git',
    args: string[],
    options: ProcessExecOptions = {}
  ): Promise<ProcessExecResult> {
    if (!ALLOWED_TOOLS.has(executable)) {
      throw new Error(`ERR_UNAUTHORIZED_PROBE_TOOL: Executable '${executable}' is not authorized.`);
    }

    const timeout = Math.min(options.timeout ?? 2000, 2000);
    const maxBuffer = options.maxBuffer ?? 1024;
    const cwd = options.cwd ?? process.cwd();

    return runSpawn(executable, args, cwd, timeout, maxBuffer);
  }
}
