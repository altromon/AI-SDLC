/**
 * AI-SDLC: Branch Safety Check (FR-052-CLI-DOCTOR-001)
 */

import { CategoryReport, DiagnosticFinding, DoctorOptions, IProcessRunner } from '../types/doctor.js';
import { SafeProcessRunnerAdapter } from './process-runner.js';

export function isProtectedBranch(b: string): boolean {
  return b === 'main' || b === 'master' || b.startsWith('release/');
}

export function evaluateBranch(branch: string): DiagnosticFinding | null {
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

export async function queryActiveBranch(runner: IProcessRunner, rootDir: string): Promise<string> {
  const res = await runner.execSafe('git', ['symbolic-ref', '--short', 'HEAD'], { cwd: rootDir });
  return (res.stdout || '').trim();
}

export function buildBehindMainFinding(branch: string): DiagnosticFinding {
  return {
    id: 'WARN_BRANCH_BEHIND_MAIN',
    category: 'branch_safety',
    status: 'warn',
    message: `Active branch '${branch}' is behind 'origin/main', which increases merge conflict risk.`,
    remediation: 'Run "git fetch origin main && git rebase origin/main" (or "git merge origin/main").',
    details: { branch },
  };
}

export async function checkBranchFreshness(
  runner: IProcessRunner,
  rootDir: string,
  branch: string
): Promise<DiagnosticFinding | null> {
  if (!branch || branch === 'HEAD') return null;
  const hasOrigin = await runner.execSafe('git', ['rev-parse', '--verify', '--quiet', 'refs/remotes/origin/main'], { cwd: rootDir });
  if (hasOrigin.exitCode !== 0) return null;
  const isAncestor = await runner.execSafe('git', ['merge-base', '--is-ancestor', 'origin/main', 'HEAD'], { cwd: rootDir });
  return isAncestor.exitCode === 0 ? null : buildBehindMainFinding(branch);
}

export function buildBranchSafetyReport(findings: DiagnosticFinding[]): CategoryReport {
  const hasFail = findings.some((f) => f.status === 'fail');
  return {
    category: 'branch_safety',
    title: 'Branch Safety & Protected Branch Enforcement',
    status: hasFail ? 'fail' : findings.length > 0 ? 'warn' : 'pass',
    findings,
  };
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
      const finding = evaluateBranch(branch) || (await checkBranchFreshness(this.runner, rootDir, branch));
      if (finding) findings.push(finding);
    } catch {
      findings.push({ id: 'ERR_BRANCH_RESOLUTION_FAILED', category: 'branch_safety', status: 'warn', message: 'Could not resolve active git branch.' });
    }
    return buildBranchSafetyReport(findings);
  }
}
