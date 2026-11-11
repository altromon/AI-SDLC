/**
 * AI-SDLC: Branch Safety Check (FR-052-CLI-DOCTOR-001)
 */

import { CategoryReport, DiagnosticFinding, DoctorOptions, IProcessRunner } from '../types/doctor.js';
import { SafeProcessRunnerAdapter } from './process-runner.js';

function isProtectedBranch(b: string): boolean {
  return b === 'main' || b === 'master' || b.startsWith('release/');
}

function evaluateBranch(branch: string): DiagnosticFinding | null {
  if (!isProtectedBranch(branch)) return null;
  return {
    id: 'ERR_PROTECTED_BRANCH_ACTIVE',
    category: 'branch_safety',
    status: 'fail',
    message: `Active branch '${branch}' is protected. Direct commits are forbidden.`,
    remediation: 'Switch to a dedicated branch: git checkout -b feat/<CHG-ID>-<slug>',
    details: { branch },
  };
}

async function queryActiveBranch(runner: IProcessRunner, rootDir: string): Promise<string> {
  const res = await runner.execSafe('git', ['symbolic-ref', '--short', 'HEAD'], { cwd: rootDir });
  return (res.stdout || '').trim();
}

export class BranchSafetyCheck {
  private runner: IProcessRunner;

  constructor(runner?: IProcessRunner) {
    this.runner = runner || new SafeProcessRunnerAdapter();
  }

  public async inspect(options: DoctorOptions): Promise<CategoryReport> {
    const findings: DiagnosticFinding[] = [];
    const rootDir = options.rootDir || process.cwd();

    try {
      const branch = await queryActiveBranch(this.runner, rootDir);
      const f = evaluateBranch(branch);
      if (f) findings.push(f);
    } catch {
      findings.push({
        id: 'ERR_BRANCH_RESOLUTION_FAILED',
        category: 'branch_safety',
        status: 'warn',
        message: 'Could not resolve active git branch.',
      });
    }

    const hasFail = findings.some((f) => f.status === 'fail');
    return {
      category: 'branch_safety',
      title: 'Branch Safety & Protected Branch Enforcement',
      status: hasFail ? 'fail' : findings.length > 0 ? 'warn' : 'pass',
      findings,
    };
  }
}
