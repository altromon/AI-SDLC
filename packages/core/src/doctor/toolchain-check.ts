/**
 * AI-SDLC: Toolchain Health Check
 */

import { CategoryReport, DiagnosticFinding, DoctorOptions, IProcessRunner } from '../types/doctor.js';
import { SafeProcessRunnerAdapter } from './process-runner.js';

interface ToolItem {
  name: 'node' | 'pnpm' | 'git';
  flag: string;
}

const TOOLS: ToolItem[] = [
  { name: 'node', flag: '--version' },
  { name: 'pnpm', flag: '--version' },
  { name: 'git', flag: '--version' },
];

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
    return res.exitCode === 0 && res.stdout.trim() ? null : buildWarning(tool.name, res.stderr);
  } catch (err: unknown) {
    return buildError(tool.name, err);
  }
}

export class ToolchainHealthCheck {
  private runner: IProcessRunner;

  constructor(runner?: IProcessRunner) {
    this.runner = runner || new SafeProcessRunnerAdapter();
  }

  public async inspect(options: DoctorOptions): Promise<CategoryReport> {
    const rootDir = options.rootDir || process.cwd();
    const results = await Promise.all(TOOLS.map((tool) => probeTool(this.runner, rootDir, tool)));
    const findings = results.filter((f): f is DiagnosticFinding => f !== null);

    const hasFail = findings.some((f) => f.status === 'fail');
    return {
      category: 'toolchain',
      title: 'Toolchain (Node, PNPM, Git) Availability & Versions',
      status: hasFail ? 'fail' : findings.length > 0 ? 'warn' : 'pass',
      findings,
    };
  }
}
