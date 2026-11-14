/**
 * AI-SDLC: Hardened Offline CLI Runner for SCA License Resolution (CHG-055, TSK-002)
 * Enforces closed argv/env tables, shell:false, PATH confinement, repo-config blockers,
 * temp HOME/caches, per-manifest single invocation, and 60s global scan budget.
 */

import * as child_process from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { UnresolvedLicenseReason } from '../../types/index.js';

export type AllowedBin = 'cargo' | 'go' | 'mvn' | 'dotnet' | 'npm' | 'pnpm' | 'pip-licenses';
export type UnresolvedReason = UnresolvedLicenseReason;
export type SafeExecResult = { ok: true; stdout: string } | { ok: false; reason: UnresolvedReason };

const MAX_TIMEOUT_MS = 10_000;
const MAX_BUFFER_BYTES = 5 * 1024 * 1024;
const GLOBAL_BUDGET_MS = 60_000;

const ALLOWED_ARGV: Record<AllowedBin, readonly string[]> = {
  cargo: ['metadata', '--offline', '--locked', '--frozen', '--format-version', '1'],
  go: ['list', '-m', '-json', 'all'],
  mvn: ['-o', '-B', '-ntp', '-q', 'dependency:list'],
  dotnet: ['list', 'package', '--include-transitive'],
  npm: ['ls', '--json', '--long', '--ignore-scripts', '--offline'],
  pnpm: ['licenses', 'list', '--json', '--ignore-scripts'],
  'pip-licenses': ['--format=json'],
};

const REPO_BLOCKERS: Partial<Record<AllowedBin, readonly string[]>> = {
  cargo: ['.cargo/config.toml', '.cargo/config', 'rust-toolchain.toml'],
  mvn: ['.mvn/extensions.xml', '.mvn/maven.config'],
  npm: ['.pnpmfile.cjs', '.npmrc'],
  pnpm: ['.pnpmfile.cjs', '.npmrc'],
};

const DOTNET_BLOCKER_FILES = new Set([
  'directory.build.props',
  'directory.build.targets',
  'directory.packages.props',
  'nuget.config',
]);

let globalBudgetStartMs: number | null = null;
const invokedManifests = new Set<string>();

export function resetGlobalBudget(): void {
  globalBudgetStartMs = null;
  invokedManifests.clear();
}

export function safeRealpath(targetPath: string): string | null {
  try {
    return fs.realpathSync(targetPath);
  } catch {
    return null;
  }
}

export function isPathInside(baseReal: string, targetReal: string): boolean {
  const rel = path.relative(baseReal, targetReal);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

export function readConfinedText(filePath: string, baseReal: string, maxBytes = 1024 * 1024): string | null {
  const realFile = safeRealpath(filePath);
  if (!realFile || !isPathInside(baseReal, realFile)) return null;
  try {
    const stat = fs.statSync(realFile);
    if (!stat.isFile() || stat.size > maxBytes) return null;
    return fs.readFileSync(realFile, 'utf-8');
  } catch {
    return null;
  }
}

function hasGlobalJsonMsbuildSdks(dir: string): boolean {
  const gjPath = path.join(dir, 'global.json');
  if (!fs.existsSync(gjPath)) return false;
  try {
    const parsed = JSON.parse(fs.readFileSync(gjPath, 'utf-8')) as Record<string, unknown>;
    return Boolean(parsed && typeof parsed === 'object' && 'msbuild-sdks' in parsed);
  } catch {
    return true;
  }
}

function hasDotnetBlockerInDir(dir: string): boolean {
  try {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      if (DOTNET_BLOCKER_FILES.has(entry.toLowerCase())) return true;
    }
  } catch {
    return false;
  }
  return hasGlobalJsonMsbuildSdks(dir);
}

function hasRepoBlockerInDir(bin: AllowedBin, dir: string): boolean {
  if (bin === 'dotnet') return hasDotnetBlockerInDir(dir);
  const relPaths = REPO_BLOCKERS[bin];
  if (!relPaths) return false;
  return relPaths.some((rel) => fs.existsSync(path.join(dir, rel)));
}

function hasBlockingRepoConfig(bin: AllowedBin, realRoot: string, realManifest: string): boolean {
  const walkToFsRoot = bin === 'dotnet';
  let current = realManifest;
  while (true) {
    if (hasRepoBlockerInDir(bin, current)) return true;
    if (!walkToFsRoot && current === realRoot) break;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return false;
}

function getSystemPathEnv(): string {
  for (const [key, val] of Object.entries(process.env)) {
    if (key.toUpperCase() === 'PATH' && typeof val === 'string') return val;
  }
  return '';
}

function isExecutableFile(candidate: string): boolean {
  try {
    const stat = fs.statSync(candidate);
    if (!stat.isFile()) return false;
    return process.platform === 'win32' || (stat.mode & 0o111) !== 0;
  } catch {
    return false;
  }
}

function resolveSystemBinary(bin: AllowedBin, realRoot: string): string | null {
  const rawPath = getSystemPathEnv();
  const exeName = process.platform === 'win32' ? `${bin}.exe` : bin;
  for (const entry of rawPath.split(path.delimiter)) {
    if (!entry || !path.isAbsolute(entry)) continue;
    const realEntry = safeRealpath(entry);
    if (!realEntry || isPathInside(realRoot, realEntry)) continue;
    const candidate = path.join(realEntry, exeName);
    const realCandidate = safeRealpath(candidate);
    if (realCandidate && !isPathInside(realRoot, realCandidate) && isExecutableFile(realCandidate)) {
      return candidate;
    }
  }
  return null;
}

const STATIC_TOOL_ENV: Record<AllowedBin, Record<string, string>> = {
  cargo: { CARGO_NET_OFFLINE: 'true' },
  go: { GOFLAGS: '-mod=readonly', GOPROXY: 'off', GOTOOLCHAIN: 'local', GOWORK: 'off' },
  mvn: {},
  dotnet: { DOTNET_CLI_TELEMETRY_OPTOUT: '1', DOTNET_SKIP_FIRST_TIME_EXPERIENCE: '1' },
  npm: { NPM_CONFIG_OFFLINE: 'true', NPM_CONFIG_IGNORE_SCRIPTS: 'true' },
  pnpm: { NPM_CONFIG_IGNORE_SCRIPTS: 'true' },
  'pip-licenses': { PYTHONNOUSERSITE: '1' },
};

const TEMP_CACHE_VARS: Partial<Record<AllowedBin, Record<string, string>>> = {
  cargo: { CARGO_HOME: '.cargo' },
  go: { GOPATH: 'go', GOCACHE: 'gocache' },
  dotnet: { NUGET_PACKAGES: '.nuget' },
  npm: { npm_config_cache: '.npm' },
  pnpm: { PNPM_HOME: '.pnpm' },
};

function buildChildEnv(bin: AllowedBin, tempHome: string): Record<string, string> {
  const env: Record<string, string> = {
    PATH: getSystemPathEnv(),
    HOME: tempHome,
    USERPROFILE: tempHome,
    TMP: os.tmpdir(),
    TEMP: os.tmpdir(),
    ...STATIC_TOOL_ENV[bin],
  };
  for (const [k, sub] of Object.entries(TEMP_CACHE_VARS[bin] || {})) {
    env[k] = path.join(tempHome, sub);
  }
  if (process.env.SYSTEMROOT) env.SYSTEMROOT = process.env.SYSTEMROOT;
  return env;
}

function mapSpawnResult(res: child_process.SpawnSyncReturns<string>): SafeExecResult {
  const errCode = (res.error as NodeJS.ErrnoException | undefined)?.code;
  if (errCode === 'ETIMEDOUT' || res.signal === 'SIGTERM') {
    return { ok: false, reason: 'cli_timeout' };
  }
  if (errCode === 'ENOBUFS' || res.error?.message?.includes('maxBuffer')) {
    return { ok: false, reason: 'output_too_large' };
  }
  if (errCode === 'ENOENT') return { ok: false, reason: 'cli_not_installed' };
  if (res.error || res.status !== 0) return { ok: false, reason: 'cli_failed' };
  if (typeof res.stdout !== 'string' || res.stdout.trim().length === 0) {
    return { ok: false, reason: 'invalid_output' };
  }
  return { ok: true, stdout: res.stdout };
}

function checkBudgetAndManifest(bin: AllowedBin, realManifest: string): SafeExecResult | null {
  if (globalBudgetStartMs === null) {
    globalBudgetStartMs = Date.now();
  } else if (Date.now() - globalBudgetStartMs >= GLOBAL_BUDGET_MS) {
    return { ok: false, reason: 'budget_exceeded' };
  }
  const key = `${bin}:${realManifest}`;
  if (invokedManifests.has(key)) return { ok: false, reason: 'budget_exceeded' };
  invokedManifests.add(key);
  return null;
}

function executeResolvedBinary(resolvedBin: string, bin: AllowedBin, realManifest: string): SafeExecResult {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-sca-home-'));
  try {
    const res = child_process.spawnSync(resolvedBin, [...ALLOWED_ARGV[bin]], {
      cwd: realManifest,
      env: buildChildEnv(bin, tempHome),
      shell: false,
      encoding: 'utf-8',
      timeout: MAX_TIMEOUT_MS,
      maxBuffer: MAX_BUFFER_BYTES,
      windowsHide: true,
    });
    return mapSpawnResult(res);
  } finally {
    fs.rmSync(tempHome, { recursive: true, force: true });
  }
}

export function runSafe(bin: AllowedBin, rootDir: string, manifestDir: string): SafeExecResult {
  if (!Object.prototype.hasOwnProperty.call(ALLOWED_ARGV, bin)) {
    throw new Error(`ERR_UNAUTHORIZED_SCA_TOOL: ${String(bin)}`);
  }
  const realRoot = safeRealpath(rootDir);
  const realManifest = safeRealpath(manifestDir);
  if (!realRoot || !realManifest || !isPathInside(realRoot, realManifest)) {
    return { ok: false, reason: 'path_rejected' };
  }
  if (hasBlockingRepoConfig(bin, realRoot, realManifest)) {
    return { ok: false, reason: 'blocked_by_repo_config' };
  }
  const budgetFail = checkBudgetAndManifest(bin, realManifest);
  if (budgetFail) return budgetFail;

  const resolvedBin = resolveSystemBinary(bin, realRoot);
  if (!resolvedBin) return { ok: false, reason: 'cli_not_installed' };
  return executeResolvedBinary(resolvedBin, bin, realManifest);
}
