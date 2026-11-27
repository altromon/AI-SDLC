/**
 * AI-SDLC: Stack-Aware Toolchain Health Check (CHG-079, TSK-002)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  CategoryReport,
  DiagnosticFinding,
  DoctorOptions,
  IProcessRunner,
  SafeProbeExecutable,
} from '../types/doctor.js';
import { CodingRuleStack, detectProjectStacks } from '../init/coding-rules-templates.js';
import { collectManifestDirs } from '../verifiers/sca/scanner-ecosystems.js';
import { SafeProcessRunnerAdapter } from './process-runner.js';

export interface ToolItem {
  name: SafeProbeExecutable;
  flag: string;
}

const BUILD_MARKERS = ['pom.xml', 'build.gradle', 'build.gradle.kts', 'CMakeLists.txt', '.clang-tidy'] as const;

const STACK_TOOL_MAP: Partial<Record<CodingRuleStack, ToolItem[]>> = {
  dotnet: [{ name: 'dotnet', flag: '--version' }],
  go: [{ name: 'go', flag: 'version' }],
  rust: [{ name: 'cargo', flag: '--version' }],
  java: [{ name: 'java', flag: '-version' }],
  kotlin: [{ name: 'java', flag: '-version' }],
};

interface MarkerRule {
  stacks: readonly CodingRuleStack[];
  files: readonly string[];
  tool: ToolItem;
}

const MARKER_TOOL_RULES: readonly MarkerRule[] = [
  { stacks: ['java', 'kotlin'], files: ['pom.xml'], tool: { name: 'mvn', flag: '--version' } },
  { stacks: ['java', 'kotlin'], files: ['build.gradle', 'build.gradle.kts'], tool: { name: 'gradle', flag: '--version' } },
  { stacks: ['c', 'cpp'], files: ['CMakeLists.txt'], tool: { name: 'cmake', flag: '--version' } },
  { stacks: ['c', 'cpp'], files: ['.clang-tidy'], tool: { name: 'clang-tidy', flag: '--version' } },
];

export function collectBuildMarkers(rootDir: string, maxDepth = 3): Set<string> {
  const found = new Set<string>();
  if (!fs.existsSync(rootDir)) return found;
  for (const dir of collectManifestDirs(rootDir, maxDepth)) {
    for (const marker of BUILD_MARKERS) {
      if (fs.existsSync(path.join(dir, marker))) found.add(marker);
    }
  }
  return found;
}

export function addMarkerTools(map: Map<SafeProbeExecutable, ToolItem>, stacks: CodingRuleStack[], markers: Set<string>): void {
  for (const rule of MARKER_TOOL_RULES) {
    const stackMatch = rule.stacks.some((s) => stacks.includes(s));
    const fileMatch = rule.files.some((f) => markers.has(f));
    if (stackMatch && fileMatch && !map.has(rule.tool.name)) {
      map.set(rule.tool.name, rule.tool);
    }
  }
}

export function buildRequiredTools(rootDir: string, stacks: CodingRuleStack[], markers: Set<string>): ToolItem[] {
  const map = new Map<SafeProbeExecutable, ToolItem>();
  map.set('node', { name: 'node', flag: '--version' });
  if (fs.existsSync(path.join(rootDir, 'pnpm-lock.yaml'))) {
    map.set('pnpm', { name: 'pnpm', flag: '--version' });
  }
  map.set('git', { name: 'git', flag: '--version' });
  for (const stack of stacks) {
    for (const tool of STACK_TOOL_MAP[stack] ?? []) {
      if (!map.has(tool.name)) map.set(tool.name, tool);
    }
  }
  addMarkerTools(map, stacks, markers);
  return Array.from(map.values());
}

export function buildWarning(name: string, stderr: string): DiagnosticFinding {
  return {
    id: `WARN_TOOLCHAIN_${name.toUpperCase()}_ISSUE`,
    category: 'toolchain',
    status: 'warn',
    message: `Toolchain binary '${name}' exited with error or returned empty output.`,
    details: { stderr },
  };
}

export function buildError(name: string, err: unknown): DiagnosticFinding {
  return {
    id: `ERR_TOOLCHAIN_${name.toUpperCase()}_MISSING`,
    category: 'toolchain',
    status: 'fail',
    message: `Toolchain binary '${name}' is missing: ${err instanceof Error ? err.message : String(err)}`,
    remediation: `Ensure '${name}' is installed and in PATH.`,
  };
}

export async function probeTool(runner: IProcessRunner, rootDir: string, tool: ToolItem): Promise<DiagnosticFinding | null> {
  try {
    const res = await runner.execSafe(tool.name, [tool.flag], { cwd: rootDir });
    const hasOutput = Boolean(res.stdout.trim() || res.stderr.trim());
    return res.exitCode === 0 && hasOutput ? null : buildWarning(tool.name, res.stderr);
  } catch (err: unknown) {
    return buildError(tool.name, err);
  }
}

export async function probePythonToolchain(runner: IProcessRunner, rootDir: string): Promise<DiagnosticFinding | null> {
  const pyRes = await probeTool(runner, rootDir, { name: 'python', flag: '--version' });
  if (pyRes === null) return null;
  const py3Res = await probeTool(runner, rootDir, { name: 'python3', flag: '--version' });
  if (py3Res === null) return null;
  return {
    ...py3Res,
    id: py3Res.status === 'fail' ? 'ERR_TOOLCHAIN_PYTHON_MISSING' : 'WARN_TOOLCHAIN_PYTHON_ISSUE',
    remediation: py3Res.status === 'fail' ? "Ensure 'python' or 'python3' is installed and in PATH." : py3Res.remediation,
  };
}

export class ToolchainHealthCheck {
  private runner: IProcessRunner;

  constructor(runner?: IProcessRunner) {
    this.runner = runner || new SafeProcessRunnerAdapter();
  }

  public async inspect(options: DoctorOptions): Promise<CategoryReport> {
    const rootDir = options.rootDir || process.cwd();
    const stacks = detectProjectStacks(rootDir, 3);
    const markers = collectBuildMarkers(rootDir, 3);
    const tools = buildRequiredTools(rootDir, stacks, markers);

    const results = await Promise.all(tools.map((tool) => probeTool(this.runner, rootDir, tool)));
    if (stacks.includes('python')) {
      results.push(await probePythonToolchain(this.runner, rootDir));
    }
    const findings = results.filter((f): f is DiagnosticFinding => f !== null);
    const hasFail = findings.some((f) => f.status === 'fail');

    return {
      category: 'toolchain',
      title: 'Toolchain Availability & Versions',
      status: hasFail ? 'fail' : findings.length > 0 ? 'warn' : 'pass',
      findings,
    };
  }
}
