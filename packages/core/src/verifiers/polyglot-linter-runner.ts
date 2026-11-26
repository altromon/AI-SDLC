/**
 * AI-SDLC: Polyglot Linter & Compiler Runner (CHG-074 / TSK-074-02)
 *
 * Detects project stacks, checks tool availability via CWE-426 trusted PATH
 * resolution, executes native linters/compilers with shell: false, and
 * redacts sensitive diagnostics before reporting.
 */

import * as fs from 'fs';
import * as path from 'path';
import { detectProjectStacks } from '../init/coding-rules-templates.js';
import {
  WIN_CMD_META_RE,
  ensureToolAvailable,
  redactSensitiveDiagnostics,
  resolveTrustedBinaryPath,
  spawnTrustedBinary,
  type EnsureToolOptions,
  type InstallableTool,
} from './tool-installer.js';

export type PolyglotLinterStack =
  | 'typescript'
  | 'javascript'
  | 'angular'
  | 'python'
  | 'dotnet'
  | 'java'
  | 'kotlin'
  | 'rust'
  | 'go'
  | 'c'
  | 'cpp';

export interface PolyglotLinterOptions extends EnsureToolOptions {
  rootDir?: string;
  stacks?: PolyglotLinterStack[];
  skipExternalLinters?: boolean;
  timeoutMs?: number;
}

export interface PolyglotLinterDiagnostic {
  stack: PolyglotLinterStack;
  tool: InstallableTool;
  status: 'passed' | 'failed' | 'skipped';
  exitCode?: number;
  message?: string;
}

export interface PolyglotLinterResult {
  success: boolean;
  detectedStacks: PolyglotLinterStack[];
  diagnostics: PolyglotLinterDiagnostic[];
  warnings: string[];
  errors: string[];
}

export interface LinterInvocation {
  stack: PolyglotLinterStack;
  tool: InstallableTool;
  binaryName: string;
  args: string[];
  skipReason?: string;
}

type ToolCommandSpec = { tool: InstallableTool; binaryName: string; args: string[] };

const DEFAULT_LINTER_TIMEOUT_MS = 120_000;
const PYTHON_MANIFESTS = ['pyproject.toml', 'requirements.txt', 'setup.py', 'Pipfile'];
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', 'reports', '.venv', 'venv', 'target', 'build']);
const SHELL_META_RE = /[;|&$`<>]/;

const STATIC_STACK_TOOLS: Partial<Record<PolyglotLinterStack, readonly ToolCommandSpec[]>> = {
  typescript: [
    { tool: 'tsc', binaryName: 'tsc', args: ['--noEmit'] },
    { tool: 'eslint', binaryName: 'eslint', args: ['.'] },
  ],
  angular: [
    { tool: 'tsc', binaryName: 'tsc', args: ['--noEmit'] },
    { tool: 'eslint', binaryName: 'eslint', args: ['.'] },
  ],
  javascript: [{ tool: 'eslint', binaryName: 'eslint', args: ['.'] }],
  python: [
    { tool: 'ruff', binaryName: 'ruff', args: ['check', '.'] },
    { tool: 'mypy', binaryName: 'mypy', args: ['.'] },
  ],
  dotnet: [{ tool: 'dotnet', binaryName: 'dotnet', args: ['build', '--no-restore'] }],
  rust: [{ tool: 'clippy', binaryName: 'cargo', args: ['clippy', '--', '-D', 'warnings'] }],
  go: [{ tool: 'golangci-lint', binaryName: 'golangci-lint', args: ['run'] }],
};

export function toSafeRelativeSource(fullPath: string, rootDir: string): string | null {
  const rel = path.relative(rootDir, fullPath).replace(/\\/g, '/');
  if (!rel || SHELL_META_RE.test(rel) || WIN_CMD_META_RE.test(rel)) {
    return null;
  }
  return `./${rel}`;
}

export function scanFilesByExt(dir: string, rootDir: string, exts: ReadonlySet<string>, depth = 0): string[] {
  if (depth > 3 || !fs.existsSync(dir)) return [];
  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) {
      found.push(...scanFilesByExt(full, rootDir, exts, depth + 1));
    } else if (entry.isFile() && exts.has(path.extname(entry.name).toLowerCase())) {
      const safeRel = toSafeRelativeSource(full, rootDir);
      if (safeRel) found.push(safeRel);
    }
  }
  return found;
}

export function resolveTargetStacks(rootDir: string, explicitStacks?: PolyglotLinterStack[]): PolyglotLinterStack[] {
  if (explicitStacks && explicitStacks.length > 0) {
    return Array.from(new Set(explicitStacks));
  }
  const detected = new Set<PolyglotLinterStack>(detectProjectStacks(rootDir) as PolyglotLinterStack[]);
  const hasPyManifest = PYTHON_MANIFESTS.some((f) => fs.existsSync(path.join(rootDir, f)));
  if (hasPyManifest || scanFilesByExt(rootDir, rootDir, new Set(['.py'])).length > 0) {
    detected.add('python');
  }
  return Array.from(detected);
}

export function buildJvmInvocations(stack: 'java' | 'kotlin', rootDir: string): LinterInvocation[] {
  const hasGradle = fs.existsSync(path.join(rootDir, 'build.gradle')) || fs.existsSync(path.join(rootDir, 'build.gradle.kts'));
  if (stack === 'kotlin') {
    const list: LinterInvocation[] = [{ stack, tool: 'detekt', binaryName: 'detekt', args: ['--config', 'config/detekt/detekt.yml'] }];
    if (hasGradle) list.push({ stack, tool: 'gradle', binaryName: 'gradle', args: ['check'] });
    return list;
  }
  const list: LinterInvocation[] = [];
  if (fs.existsSync(path.join(rootDir, 'pom.xml'))) list.push({ stack, tool: 'mvn', binaryName: 'mvn', args: ['compile'] });
  if (hasGradle) list.push({ stack, tool: 'gradle', binaryName: 'gradle', args: ['check'] });
  list.push({ stack, tool: 'pmd', binaryName: 'pmd', args: ['check', '-d', '.', '-R', 'config/pmd/aisdlc-ruleset.xml'] });
  return list;
}

export function buildClangTidyInvocation(stack: 'c' | 'cpp', rootDir: string): LinterInvocation {
  if (!fs.existsSync(path.join(rootDir, 'compile_commands.json'))) {
    return { stack, tool: 'clang-tidy', binaryName: 'clang-tidy', args: [], skipReason: `Skipping clang-tidy for ${stack}: compile_commands.json not found.` };
  }
  const exts = stack === 'c' ? new Set(['.c']) : new Set(['.cpp', '.cc', '.cxx']);
  const files = scanFilesByExt(rootDir, rootDir, exts);
  if (files.length === 0) {
    return { stack, tool: 'clang-tidy', binaryName: 'clang-tidy', args: [], skipReason: `Skipping clang-tidy for ${stack}: no source files found.` };
  }
  return { stack, tool: 'clang-tidy', binaryName: 'clang-tidy', args: ['-p', '.', '--', ...files] };
}

export function buildStackInvocations(stack: PolyglotLinterStack, rootDir: string): LinterInvocation[] {
  const staticSpecs = STATIC_STACK_TOOLS[stack];
  if (staticSpecs) {
    return staticSpecs.map((s) => ({ stack, tool: s.tool, binaryName: s.binaryName, args: [...s.args] }));
  }
  if (stack === 'java' || stack === 'kotlin') {
    return buildJvmInvocations(stack, rootDir);
  }
  return [buildClangTidyInvocation(stack as 'c' | 'cpp', rootDir)];
}

export async function resolveBinaryForInvocation(
  inv: LinterInvocation,
  rootDir: string,
  options: PolyglotLinterOptions
): Promise<{ binPath: string | null; warning?: string }> {
  const existing = resolveTrustedBinaryPath(inv.binaryName, rootDir);
  if (existing) return { binPath: existing };
  const ensured = await ensureToolAvailable(inv.tool, { ...options, rootDir });
  if (!ensured.available) return { binPath: null, warning: ensured.missingError || ensured.warning };
  const resolved = resolveTrustedBinaryPath(inv.binaryName, rootDir);
  if (resolved) return { binPath: resolved };
  return { binPath: null, warning: redactSensitiveDiagnostics(`Tool "${inv.tool}" not found in trusted PATH.`, rootDir) };
}

export function buildFailureOutcome(
  inv: LinterInvocation,
  res: ReturnType<typeof spawnTrustedBinary>,
  rootDir: string
): { diagnostic: PolyglotLinterDiagnostic; error: string } {
  const detail = [res.error?.message, res.stdout, res.stderr].filter(Boolean).join('\n').trim() || `exit ${res.status ?? 'null'}`;
  const error = redactSensitiveDiagnostics(`${inv.tool} (${inv.stack}) failed: ${detail}`, rootDir);
  return { diagnostic: { stack: inv.stack, tool: inv.tool, status: 'failed', exitCode: res.status ?? undefined, message: error }, error };
}

export async function executeInvocation(
  inv: LinterInvocation,
  rootDir: string,
  options: PolyglotLinterOptions
): Promise<{ diagnostic: PolyglotLinterDiagnostic; warning?: string; error?: string }> {
  if (inv.skipReason) {
    const warning = redactSensitiveDiagnostics(inv.skipReason, rootDir);
    return { diagnostic: { stack: inv.stack, tool: inv.tool, status: 'skipped', message: warning }, warning };
  }
  const { binPath, warning } = await resolveBinaryForInvocation(inv, rootDir, options);
  if (!binPath) {
    return { diagnostic: { stack: inv.stack, tool: inv.tool, status: 'skipped', message: warning }, warning };
  }
  const res = spawnTrustedBinary(binPath, inv.args, { cwd: rootDir, timeout: options.timeoutMs ?? DEFAULT_LINTER_TIMEOUT_MS, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (!res.error && res.status === 0) {
    return { diagnostic: { stack: inv.stack, tool: inv.tool, status: 'passed', exitCode: 0 } };
  }
  return buildFailureOutcome(inv, res, rootDir);
}

export async function runPolyglotLinters(
  options: PolyglotLinterOptions = {}
): Promise<PolyglotLinterResult> {
  const rootDir = options.rootDir || process.cwd();
  const detectedStacks = resolveTargetStacks(rootDir, options.stacks);
  if (options.skipExternalLinters || detectedStacks.length === 0) {
    return { success: true, detectedStacks, diagnostics: [], warnings: [], errors: [] };
  }
  const diagnostics: PolyglotLinterDiagnostic[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  for (const stack of detectedStacks) {
    for (const inv of buildStackInvocations(stack, rootDir)) {
      const outcome = await executeInvocation(inv, rootDir, options);
      diagnostics.push(outcome.diagnostic);
      if (outcome.warning) warnings.push(outcome.warning);
      if (outcome.error) errors.push(outcome.error);
    }
  }
  return { success: errors.length === 0, detectedStacks, diagnostics, warnings, errors };
}
