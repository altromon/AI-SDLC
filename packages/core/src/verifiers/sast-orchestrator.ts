/**
 * AI-SDLC: Polyglot SAST CLI Orchestrator (CHG-059 / TSK-002)
 *
 * Detects project ecosystems deterministically, runs native SAST CLIs + Semgrep
 * with shell: false and bounded timeouts, writes SARIF v2.1.0 to an isolated 0o700
 * temp directory, and ingests via CHG-057 two-root confinement.
 */

import * as child_process from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { SastViolation } from '../types/index.js';
import { ingestSarifFiles } from './sarif-ingest.js';
import { parseSarifDocuments } from './sarif-sast.js';
import {
  ensureToolAvailable,
  redactSensitiveDiagnostics,
  resolveTrustedBinaryPath,
  spawnTrustedBinary,
  type EnsureToolOptions,
  type InstallableTool,
  type ToolInstallSpec,
} from './tool-installer.js';

export type ProjectEcosystem = 'python' | 'go' | 'dotnet' | 'java' | 'node';

export interface PolyglotOrchestrationOptions {
  semgrep?: boolean;
  nonInteractive?: boolean;
  noInstallPrompt?: boolean;
  ci?: boolean;
  isTTY?: boolean;
  failOnMissingTool?: boolean;
  timeoutMs?: number;
  confirmInstall?: (spec: ToolInstallSpec) => Promise<boolean> | boolean;
}

export interface PolyglotToolDiagnostic {
  tool: InstallableTool;
  status: 'executed' | 'skipped' | 'failed';
  message?: string;
}

export interface PolyglotOrchestrationResult {
  ecosystems: ProjectEcosystem[];
  violations: SastViolation[];
  warnings: string[];
  diagnostics: PolyglotToolDiagnostic[];
  executedTools: InstallableTool[];
}

const DEFAULT_SAST_TIMEOUT_MS = 120_000;
const ECOSYSTEM_ORDER: readonly ProjectEcosystem[] = ['python', 'go', 'dotnet', 'java', 'node'];
const SKIP_SCAN_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', 'reports', 'bin', 'obj']);

const EXT_ECOSYSTEM_MAP: Record<string, ProjectEcosystem> = {
  '.py': 'python',
  '.go': 'go',
  '.cs': 'dotnet',
  '.fs': 'dotnet',
  '.csproj': 'dotnet',
  '.sln': 'dotnet',
  '.fsproj': 'dotnet',
  '.java': 'java',
  '.kt': 'java',
  '.ts': 'node',
  '.tsx': 'node',
  '.js': 'node',
  '.jsx': 'node',
  '.mjs': 'node',
  '.cjs': 'node',
};

const MANIFEST_ECOSYSTEMS: readonly [string, ProjectEcosystem][] = [
  ['pyproject.toml', 'python'],
  ['requirements.txt', 'python'],
  ['setup.py', 'python'],
  ['Pipfile', 'python'],
  ['go.mod', 'go'],
  ['pom.xml', 'java'],
  ['build.gradle', 'java'],
  ['build.gradle.kts', 'java'],
  ['package.json', 'node'],
  ['tsconfig.json', 'node'],
];

function detectManifestEcosystems(rootDir: string, found: Set<ProjectEcosystem>): void {
  for (const [file, eco] of MANIFEST_ECOSYSTEMS) {
    if (fs.existsSync(path.join(rootDir, file))) {
      found.add(eco);
    }
  }
}

function scanDirectoryForEcosystems(dir: string, found: Set<ProjectEcosystem>, depth: number): void {
  if (depth > 4 || found.size === ECOSYSTEM_ORDER.length) return;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!SKIP_SCAN_DIRS.has(entry.name)) {
        scanDirectoryForEcosystems(path.join(dir, entry.name), found, depth + 1);
      }
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    const eco = EXT_ECOSYSTEM_MAP[ext];
    if (eco) found.add(eco);
  }
}

export function detectProjectEcosystems(rootDir: string): ProjectEcosystem[] {
  if (!fs.existsSync(rootDir)) return [];
  const found = new Set<ProjectEcosystem>();
  detectManifestEcosystems(rootDir, found);
  scanDirectoryForEcosystems(rootDir, found, 0);
  return ECOSYSTEM_ORDER.filter((eco) => found.has(eco));
}

function buildToolPlan(ecosystems: ProjectEcosystem[], includeSemgrep: boolean): InstallableTool[] {
  const tools: InstallableTool[] = [];
  if (ecosystems.includes('python')) tools.push('bandit', 'ruff');
  if (ecosystems.includes('go')) tools.push('gosec');
  if (ecosystems.includes('dotnet')) tools.push('dotnet');
  if (ecosystems.includes('java')) tools.push('spotbugs');
  if (ecosystems.includes('node')) tools.push('eslint');
  if (includeSemgrep) tools.push('semgrep');
  return tools;
}

function getToolInvocation(
  tool: InstallableTool,
  tmpDir: string
): { args: string[]; sarifFile: string } {
  const sarifName = `${tool}.sarif`;
  const sarifFile = path.join(tmpDir, sarifName);
  const argMap: Record<InstallableTool, string[]> = {
    bandit: ['-f', 'sarif', '-o', sarifFile, '-r', '.'],
    ruff: ['check', '--output-format', 'sarif', '--output-file', sarifFile, '.'],
    gosec: ['-fmt', 'sarif', '-out', sarifFile, './...'],
    dotnet: ['build', `/p:ErrorLog=${sarifFile},version=2.1`],
    spotbugs: [`-sarif=${sarifFile}`, '.'],
    eslint: ['--format', '@microsoft/eslint-formatter-sarif', '-o', sarifFile, '.'],
    semgrep: ['scan', '--config', 'auto', '--sarif', '--output', sarifFile],
    trivy: ['fs', '--format', 'sarif', '--output', sarifFile, '.'],
  };
  return { args: argMap[tool], sarifFile };
}

function hasNonEmptyFile(filePath: string): boolean {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).size > 0;
  } catch {
    return false;
  }
}

function formatToolFailure(
  tool: InstallableTool,
  res: child_process.SpawnSyncReturns<string>,
  rootDir: string
): string {
  const raw = [res.error?.message, typeof res.stderr === 'string' ? res.stderr : '']
    .filter(Boolean)
    .join(' ')
    .trim();
  const detail = raw || `exit status ${res.status ?? 'null'}`;
  return redactSensitiveDiagnostics(`${tool} failed: ${detail}`, rootDir);
}

interface ToolRunContext {
  rootDir: string;
  tmpDir: string;
  options: PolyglotOrchestrationOptions;
  sarifFiles: string[];
  warnings: string[];
  diagnostics: PolyglotToolDiagnostic[];
  executedTools: InstallableTool[];
}

function buildEnsureToolOptions(
  rootDir: string,
  options: PolyglotOrchestrationOptions
): EnsureToolOptions {
  return {
    rootDir,
    nonInteractive: options.nonInteractive,
    noInstallPrompt: options.noInstallPrompt,
    ci: options.ci,
    isTTY: options.isTTY,
    failOnMissingTool: options.failOnMissingTool,
    timeoutMs: options.timeoutMs,
    confirmInstall: options.confirmInstall,
  };
}

async function resolveOrInstallTool(
  tool: InstallableTool,
  rootDir: string,
  options: PolyglotOrchestrationOptions
): Promise<{ binPath: string | null; warning?: string }> {
  const existing = resolveTrustedBinaryPath(tool, rootDir);
  if (existing) return { binPath: existing };

  const ensured = await ensureToolAvailable(tool, buildEnsureToolOptions(rootDir, options));
  if (!ensured.available) {
    return { binPath: null, warning: ensured.missingError || ensured.warning };
  }
  const resolved = resolveTrustedBinaryPath(tool, rootDir);
  if (resolved) return { binPath: resolved };
  return {
    binPath: null,
    warning: redactSensitiveDiagnostics(
      `Tool "${tool}" could not be resolved from trusted PATH after installation.`,
      rootDir
    ),
  };
}

function spawnToolProcess(
  binPath: string,
  args: string[],
  rootDir: string,
  timeoutMs?: number
): child_process.SpawnSyncReturns<string> {
  return spawnTrustedBinary(binPath, args, {
    cwd: rootDir,
    timeout: timeoutMs ?? DEFAULT_SAST_TIMEOUT_MS,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function recordToolOutcome(
  tool: InstallableTool,
  res: child_process.SpawnSyncReturns<string>,
  sarifFile: string,
  ctx: ToolRunContext
): void {
  const sarifExists = hasNonEmptyFile(sarifFile);
  const okExit = !res.error && (res.status === 0 || (res.status === 1 && sarifExists));
  if (!okExit) {
    const msg = formatToolFailure(tool, res, ctx.rootDir);
    ctx.diagnostics.push({ tool, status: 'failed', message: msg });
    ctx.warnings.push(msg);
    return;
  }
  ctx.executedTools.push(tool);
  ctx.diagnostics.push({ tool, status: 'executed' });
  if (sarifExists) ctx.sarifFiles.push(path.basename(sarifFile));
}

async function executeSingleTool(tool: InstallableTool, ctx: ToolRunContext): Promise<void> {
  const resolved = await resolveOrInstallTool(tool, ctx.rootDir, ctx.options);
  if (!resolved.binPath) {
    ctx.diagnostics.push({ tool, status: 'skipped', message: resolved.warning });
    if (resolved.warning) ctx.warnings.push(resolved.warning);
    return;
  }
  const { args, sarifFile } = getToolInvocation(tool, ctx.tmpDir);
  const res = spawnToolProcess(resolved.binPath, args, ctx.rootDir, ctx.options.timeoutMs);
  recordToolOutcome(tool, res, sarifFile, ctx);
}

export function deduplicateAndSortSastViolations(violations: SastViolation[]): SastViolation[] {
  const seen = new Set<string>();
  const unique: SastViolation[] = [];
  for (const v of violations) {
    const key = `${v.relPath}\0${v.lineNumber}\0${v.ruleId}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(v);
    }
  }
  return unique.sort((a, b) => {
    if (a.relPath !== b.relPath) return a.relPath < b.relPath ? -1 : 1;
    if (a.lineNumber !== b.lineNumber) return a.lineNumber - b.lineNumber;
    return a.ruleId < b.ruleId ? -1 : a.ruleId > b.ruleId ? 1 : 0;
  });
}

function ingestTmpSarifReports(
  tmpDir: string,
  rootDir: string,
  sarifFiles: string[],
  warnings: string[]
): SastViolation[] {
  const violations: SastViolation[] = [];
  for (const file of sarifFiles) {
    try {
      const docs = ingestSarifFiles(tmpDir, [file]);
      violations.push(...parseSarifDocuments(rootDir, docs));
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      warnings.push(redactSensitiveDiagnostics(`SARIF ingestion warning (${file}): ${rawMsg}`, rootDir));
    }
  }
  return violations;
}

export async function orchestratePolyglotSast(
  rootDir: string,
  options: PolyglotOrchestrationOptions = {}
): Promise<PolyglotOrchestrationResult> {
  const ecosystems = detectProjectEcosystems(rootDir);
  const tools = buildToolPlan(ecosystems, options.semgrep !== false);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-sast-'));
  try {
    fs.chmodSync(tmpDir, 0o700);
  } catch {
    // Best-effort on Windows
  }

  const ctx: ToolRunContext = {
    rootDir,
    tmpDir,
    options,
    sarifFiles: [],
    warnings: [],
    diagnostics: [],
    executedTools: [],
  };

  try {
    for (const tool of tools) {
      await executeSingleTool(tool, ctx);
    }
    const ingested = ingestTmpSarifReports(tmpDir, rootDir, ctx.sarifFiles, ctx.warnings);
    return {
      ecosystems,
      violations: deduplicateAndSortSastViolations(ingested),
      warnings: ctx.warnings,
      diagnostics: ctx.diagnostics,
      executedTools: ctx.executedTools,
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
