/**
 * AI-SDLC: Secure Tool Installer & Trusted PATH Resolver (CHG-059 / TSK-001)
 *
 * Enforces:
 * - Deep-frozen TOOL_INSTALL_ALLOWLIST across win32/darwin/linux (zero sudo, zero shell metacharacters)
 * - CWE-426 safe PATH resolution skipping '.' and rootDir
 * - Non-blocking CI/non-interactive mode with normalized CI env check
 * - Sensitive diagnostic redaction (rootDir, tokens, credentials)
 */

import * as child_process from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export type InstallableTool =
  | 'semgrep'
  | 'trivy'
  | 'gitleaks'
  | 'bandit'
  | 'ruff'
  | 'gosec'
  | 'dotnet'
  | 'spotbugs'
  | 'eslint'
  | 'tsc'
  | 'mypy'
  | 'golangci-lint'
  | 'clippy'
  | 'pmd'
  | 'detekt'
  | 'mvn'
  | 'gradle'
  | 'clang-tidy';

export type SupportedPlatform = 'win32' | 'darwin' | 'linux';

export interface ToolInstallSpec {
  readonly tool: InstallableTool;
  readonly platform: SupportedPlatform;
  readonly command: string;
  readonly args: readonly string[];
  readonly displayCommand: string;
}

export interface EnsureToolOptions {
  rootDir?: string;
  nonInteractive?: boolean;
  noInstallPrompt?: boolean;
  ci?: boolean;
  isTTY?: boolean;
  failOnMissingTool?: boolean;
  timeoutMs?: number;
  confirmInstall?: (spec: ToolInstallSpec) => Promise<boolean> | boolean;
}

export interface EnsureToolResult {
  tool: InstallableTool;
  available: boolean;
  installedNow: boolean;
  prompted: boolean;
  warning?: string;
  missingError?: string;
}

const DEFAULT_INSTALL_TIMEOUT_MS = 120_000;

function freezeSpec(
  tool: InstallableTool,
  platform: SupportedPlatform,
  command: string,
  args: string[]
): ToolInstallSpec {
  const frozenArgs = Object.freeze([...args]);
  return Object.freeze({
    tool,
    platform,
    command,
    args: frozenArgs,
    displayCommand: [command, ...frozenArgs].join(' '),
  });
}

function freezePlatforms(
  tool: InstallableTool,
  win32: [string, string[]],
  darwin: [string, string[]],
  linux: [string, string[]]
): Readonly<Record<SupportedPlatform, ToolInstallSpec>> {
  return Object.freeze({
    win32: freezeSpec(tool, 'win32', win32[0], win32[1]),
    darwin: freezeSpec(tool, 'darwin', darwin[0], darwin[1]),
    linux: freezeSpec(tool, 'linux', linux[0], linux[1]),
  });
}

export const TOOL_INSTALL_ALLOWLIST: Readonly<
  Record<InstallableTool, Readonly<Record<SupportedPlatform, ToolInstallSpec>>>
> = Object.freeze({
  semgrep: freezePlatforms(
    'semgrep',
    ['pip', ['install', 'semgrep']],
    ['brew', ['install', 'semgrep']],
    ['pip3', ['install', '--user', 'semgrep']]
  ),
  trivy: freezePlatforms(
    'trivy',
    ['winget', ['install', 'AquaSecurity.Trivy']],
    ['brew', ['install', 'trivy']],
    ['apt-get', ['install', '-y', 'trivy']]
  ),
  gitleaks: freezePlatforms(
    'gitleaks',
    ['winget', ['install', 'Gitleaks.Gitleaks']],
    ['brew', ['install', 'gitleaks']],
    ['go', ['install', 'github.com/gitleaks/gitleaks/v8@latest']]
  ),
  bandit: freezePlatforms(
    'bandit',
    ['pip', ['install', 'bandit']],
    ['pip3', ['install', '--user', 'bandit']],
    ['pip3', ['install', '--user', 'bandit']]
  ),
  ruff: freezePlatforms(
    'ruff',
    ['pip', ['install', 'ruff']],
    ['brew', ['install', 'ruff']],
    ['pip3', ['install', '--user', 'ruff']]
  ),
  gosec: freezePlatforms(
    'gosec',
    ['go', ['install', 'github.com/securego/gosec/v2/cmd/gosec@latest']],
    ['brew', ['install', 'gosec']],
    ['go', ['install', 'github.com/securego/gosec/v2/cmd/gosec@latest']]
  ),
  dotnet: freezePlatforms(
    'dotnet',
    ['winget', ['install', 'Microsoft.DotNet.SDK.8']],
    ['brew', ['install', '--cask', 'dotnet-sdk']],
    ['apt-get', ['install', '-y', 'dotnet-sdk-8.0']]
  ),
  spotbugs: freezePlatforms(
    'spotbugs',
    ['scoop', ['install', 'spotbugs']],
    ['brew', ['install', 'spotbugs']],
    ['apt-get', ['install', '-y', 'spotbugs']]
  ),
  eslint: freezePlatforms(
    'eslint',
    ['npm', ['install', '-g', 'eslint']],
    ['npm', ['install', '-g', 'eslint']],
    ['npm', ['install', '-g', 'eslint']]
  ),
  tsc: freezePlatforms(
    'tsc',
    ['npm', ['install', '-g', 'typescript']],
    ['npm', ['install', '-g', 'typescript']],
    ['npm', ['install', '-g', 'typescript']]
  ),
  mypy: freezePlatforms(
    'mypy',
    ['pip', ['install', 'mypy']],
    ['pip3', ['install', '--user', 'mypy']],
    ['pip3', ['install', '--user', 'mypy']]
  ),
  'golangci-lint': freezePlatforms(
    'golangci-lint',
    ['go', ['install', 'github.com/golangci/golangci-lint/cmd/golangci-lint@latest']],
    ['brew', ['install', 'golangci-lint']],
    ['go', ['install', 'github.com/golangci/golangci-lint/cmd/golangci-lint@latest']]
  ),
  clippy: freezePlatforms(
    'clippy',
    ['rustup', ['component', 'add', 'clippy']],
    ['rustup', ['component', 'add', 'clippy']],
    ['rustup', ['component', 'add', 'clippy']]
  ),
  pmd: freezePlatforms(
    'pmd',
    ['scoop', ['install', 'pmd']],
    ['brew', ['install', 'pmd']],
    ['apt-get', ['install', '-y', 'pmd']]
  ),
  detekt: freezePlatforms(
    'detekt',
    ['scoop', ['install', 'detekt']],
    ['brew', ['install', 'detekt']],
    ['brew', ['install', 'detekt']]
  ),
  mvn: freezePlatforms(
    'mvn',
    ['winget', ['install', 'Apache.Maven']],
    ['brew', ['install', 'maven']],
    ['apt-get', ['install', '-y', 'maven']]
  ),
  gradle: freezePlatforms(
    'gradle',
    ['winget', ['install', 'Gradle.Gradle']],
    ['brew', ['install', 'gradle']],
    ['apt-get', ['install', '-y', 'gradle']]
  ),
  'clang-tidy': freezePlatforms(
    'clang-tidy',
    ['winget', ['install', 'LLVM.LLVM']],
    ['brew', ['install', 'llvm']],
    ['apt-get', ['install', '-y', 'clang-tidy']]
  ),
});

export function getToolInstallSpec(
  tool: string,
  platform: NodeJS.Platform = process.platform
): ToolInstallSpec | null {
  if (!Object.prototype.hasOwnProperty.call(TOOL_INSTALL_ALLOWLIST, tool)) {
    return null;
  }
  const byPlatform = TOOL_INSTALL_ALLOWLIST[tool as InstallableTool];
  if (!Object.prototype.hasOwnProperty.call(byPlatform, platform)) {
    return null;
  }
  return byPlatform[platform as SupportedPlatform];
}

function normalizeForPathCompare(targetPath: string): string {
  const resolved = path.resolve(targetPath);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function isUntrustedPathEntry(entry: string, normalizedRoot?: string): boolean {
  const trimmed = entry.trim();
  if (!trimmed || trimmed === '.' || trimmed === './' || trimmed === '.\\') {
    return true;
  }
  if (!path.isAbsolute(trimmed)) {
    return true;
  }
  if (normalizedRoot) {
    const normalizedEntry = normalizeForPathCompare(trimmed);
    const rel = path.relative(normalizedRoot, normalizedEntry);
    if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) {
      return true;
    }
  }
  return false;
}

function getWinCandidates(dir: string, binaryName: string): string[] {
  if (path.extname(binaryName)) {
    return [path.join(dir, binaryName)];
  }
  const rawExts = (process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD')
    .split(';')
    .map((e) => e.trim())
    .filter(Boolean);
  const exts = rawExts.length > 0 ? rawExts : ['.EXE', '.CMD', '.BAT'];
  return exts.map((ext) => path.join(dir, `${binaryName}${ext.toLowerCase()}`));
}

function isExecutableFile(candidate: string): boolean {
  try {
    const stat = fs.statSync(candidate);
    if (!stat.isFile()) return false;
    if (process.platform !== 'win32') {
      fs.accessSync(candidate, fs.constants.X_OK);
    }
    return true;
  } catch {
    return false;
  }
}

function findExecutableInDir(dir: string, binaryName: string): string | null {
  const candidates =
    process.platform === 'win32' ? getWinCandidates(dir, binaryName) : [path.join(dir, binaryName)];
  return candidates.find(isExecutableFile) ?? null;
}

export function resolveTrustedBinaryPath(binaryName: string, rootDir?: string): string | null {
  if (!binaryName || binaryName.includes('/') || binaryName.includes('\\')) {
    return null;
  }
  const pathEnv = process.env.PATH || '';
  const normalizedRoot = rootDir ? normalizeForPathCompare(rootDir) : undefined;

  for (const dir of pathEnv.split(path.delimiter)) {
    if (isUntrustedPathEntry(dir, normalizedRoot)) continue;
    const found = findExecutableInDir(dir, binaryName);
    if (found) return found;
  }
  return null;
}

export const WIN_CMD_META_RE = /[&|;<>^%\r\n]/;

export function resolveWinCmdSpawn(
  binPath: string,
  args: readonly string[]
): { command: string; args: string[]; rejectedMetachar?: boolean } {
  const isWinBatch = process.platform === 'win32' && /\.(cmd|bat)$/i.test(binPath);
  if (!isWinBatch) {
    return { command: binPath, args: [...args] };
  }
  if (args.some((arg) => WIN_CMD_META_RE.test(arg))) {
    return { command: binPath, args: [...args], rejectedMetachar: true };
  }
  const rawComSpec = process.env.ComSpec?.trim();
  const comSpec =
    rawComSpec && path.win32.isAbsolute(rawComSpec) && !WIN_CMD_META_RE.test(rawComSpec)
      ? rawComSpec
      : path.win32.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'cmd.exe');
  return { command: comSpec, args: ['/d', '/s', '/c', binPath, ...args] };
}

function buildSpawnErrorResult(message: string): child_process.SpawnSyncReturns<string> {
  return {
    pid: 0,
    output: [null, '', ''],
    stdout: '',
    stderr: '',
    status: null,
    signal: null,
    error: new Error(message),
  };
}

export function spawnTrustedBinary(
  binPath: string,
  args: readonly string[],
  options: child_process.SpawnSyncOptionsWithStringEncoding
): child_process.SpawnSyncReturns<string> {
  const resolved = resolveWinCmdSpawn(binPath, args);
  if (resolved.rejectedMetachar) {
    return buildSpawnErrorResult('Rejected unsafe shell metacharacter in Windows batch arguments.');
  }
  return child_process.spawnSync(resolved.command, resolved.args, {
    ...options,
    shell: false,
  });
}

export function isToolInstalled(toolName: string, rootDir?: string): boolean {
  if (toolName === 'clippy') {
    if (resolveTrustedBinaryPath('cargo-clippy', rootDir) !== null) {
      return true;
    }
    const cargoBin = resolveTrustedBinaryPath('cargo', rootDir);
    if (!cargoBin) return false;
    const res = spawnTrustedBinary(cargoBin, ['clippy', '--version'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return !res.error && res.status === 0;
  }
  return resolveTrustedBinaryPath(toolName, rootDir) !== null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replacePathVariants(text: string, targetPath: string, placeholder: string): string {
  const resolved = path.resolve(targetPath);
  const variants = Array.from(
    new Set([
      resolved.replace(/\\/g, '\\\\'),
      targetPath.replace(/\\/g, '\\\\'),
      targetPath,
      resolved,
      targetPath.replace(/\\/g, '/'),
      resolved.replace(/\\/g, '/'),
    ])
  )
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  const flags = process.platform === 'win32' ? 'gi' : 'g';
  let result = text;
  for (const v of variants) {
    result = result.replace(new RegExp(escapeRegExp(v), flags), placeholder);
  }
  return result;
}

export function redactSensitiveDiagnostics(text: string, rootDir?: string): string {
  if (!text) return '';
  let result = text;
  if (rootDir) {
    result = replacePathVariants(result, rootDir, '<workspace>');
  }
  result = replacePathVariants(result, os.tmpdir(), '<tmpdir>');
  result = replacePathVariants(result, os.homedir(), '<home>');
  return result
    .replace(/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{6,}\b/g, '<redacted>')
    .replace(/\bgithub_pat_[A-Za-z0-9_]{6,}\b/g, '<redacted>')
    .replace(/\bglpat-[A-Za-z0-9_-]{6,}\b/g, '<redacted>')
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, '<redacted>')
    .replace(/\bBearer\s+[A-Za-z0-9._-]{6,}/gi, 'Bearer <redacted>')
    .replace(/\b([A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|API_KEY|AUTH_KEY))=([^\s'"]+)/gi, '$1=<redacted>');
}

function isNonInteractiveMode(options: EnsureToolOptions): boolean {
  const ciEnv = process.env.CI?.toLowerCase();
  const isCi = ciEnv === 'true' || ciEnv === '1';
  const hasTTY = options.isTTY ?? Boolean(process.stdin?.isTTY && process.stdout?.isTTY);
  return Boolean(options.nonInteractive || options.noInstallPrompt || options.ci || isCi || !hasTTY);
}

function buildMissingToolResult(
  tool: InstallableTool,
  prompted: boolean,
  message: string,
  options: EnsureToolOptions
): EnsureToolResult {
  const redacted = redactSensitiveDiagnostics(message, options.rootDir);
  return {
    tool,
    available: false,
    installedNow: false,
    prompted,
    warning: redacted,
    ...(options.failOnMissingTool ? { missingError: redacted } : {}),
  };
}

function formatSpawnFailureDetail(res: child_process.SpawnSyncReturns<string>): string {
  const detail = [res.error?.message, typeof res.stderr === 'string' ? res.stderr : '']
    .filter(Boolean)
    .join(' ')
    .trim();
  return detail || `exit code ${res.status ?? 'null'}`;
}

function runToolInstallProcess(
  spec: ToolInstallSpec,
  options: EnsureToolOptions
): { ok: boolean; errorDetail: string } {
  const resolvedCmd = resolveTrustedBinaryPath(spec.command, options.rootDir);
  if (!resolvedCmd) {
    return { ok: false, errorDetail: `Installer command "${spec.command}" not found in trusted PATH.` };
  }
  const res = spawnTrustedBinary(resolvedCmd, spec.args, {
    timeout: options.timeoutMs ?? DEFAULT_INSTALL_TIMEOUT_MS,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (!res.error && res.status === 0) {
    return { ok: true, errorDetail: '' };
  }
  return { ok: false, errorDetail: formatSpawnFailureDetail(res) };
}

async function requestInstallApproval(
  tool: InstallableTool,
  spec: ToolInstallSpec,
  options: EnsureToolOptions
): Promise<{ approved: boolean; abortedResult?: EnsureToolResult }> {
  try {
    const approved = options.confirmInstall ? await options.confirmInstall(spec) : false;
    return { approved };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    const msg = `Missing tool "${tool}" (installation prompt aborted: ${reason}). Install with: ${spec.displayCommand}`;
    return { approved: false, abortedResult: buildMissingToolResult(tool, true, msg, options) };
  }
}

async function promptAndInstallTool(
  tool: InstallableTool,
  spec: ToolInstallSpec,
  options: EnsureToolOptions
): Promise<EnsureToolResult> {
  const { approved, abortedResult } = await requestInstallApproval(tool, spec, options);
  if (abortedResult) return abortedResult;
  if (!approved) {
    const msg = `Missing tool "${tool}" (installation declined). Install with: ${spec.displayCommand}`;
    return buildMissingToolResult(tool, true, msg, options);
  }
  const outcome = runToolInstallProcess(spec, options);
  if (outcome.ok) {
    return { tool, available: true, installedNow: true, prompted: true };
  }
  return buildMissingToolResult(tool, true, `Failed to install "${tool}": ${outcome.errorDetail}`, options);
}

export async function ensureToolAvailable(
  tool: InstallableTool,
  options: EnsureToolOptions = {}
): Promise<EnsureToolResult> {
  if (isToolInstalled(tool, options.rootDir)) {
    return { tool, available: true, installedNow: false, prompted: false };
  }
  const spec = getToolInstallSpec(tool);
  if (!spec) {
    return buildMissingToolResult(tool, false, `Tool "${tool}" is not in the install allowlist.`, options);
  }
  if (isNonInteractiveMode(options)) {
    const msg = `Tool "${tool}" is not installed. Install with: ${spec.displayCommand}`;
    return buildMissingToolResult(tool, false, msg, options);
  }
  return promptAndInstallTool(tool, spec, options);
}
