/**
 * AI-SDLC: Git Hooks Health Check (SEC-REQ-052-TAMPER-RESISTANT-HOOK-VERIFICATION-001)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CategoryReport, DiagnosticFinding, DoctorOptions } from '../types/doctor.js';
import { PRE_COMMIT_SCRIPT, PREPARE_COMMIT_MSG_SCRIPT } from '../git/hook-installer.js';

type HookName = 'pre-commit' | 'prepare-commit-msg';

function isSymlink(targetPath: string): boolean {
  try {
    return fs.lstatSync(targetPath).isSymbolicLink();
  } catch {
    return false;
  }
}

function checkPreCommitIntegrity(content: string): boolean {
  const hasHeader = content.includes('# AI-SDLC: Universal Protected Branches Guard');
  const hasBranch = content.includes('main') && content.includes('master') && content.includes('release');
  return hasHeader && hasBranch && content.includes('exit 1');
}

function checkPrepareCommitMsgIntegrity(content: string): boolean {
  const hasHeader = content.includes('# AI-SDLC: Automated Commit Trailers Injection Hook');
  return hasHeader && (content.includes('Task-ID') || content.includes('TASK_ID'));
}

function checkMissingHook(hookPath: string, name: HookName): DiagnosticFinding | null {
  if (fs.existsSync(hookPath)) return null;
  return {
    id: 'ERR_HOOKS_NOT_INSTALLED',
    category: 'git_hooks',
    status: 'fail',
    message: `Required git hook '${name}' is missing.`,
    remediation: 'Run "aisdlc doctor --fix" or "pnpm run git:hook:install" to install.',
  };
}

function checkSymlinkOrEmpty(hookPath: string, name: HookName): DiagnosticFinding | null {
  if (isSymlink(hookPath)) {
    return {
      id: 'ERR_HOOKS_SYMLINK_REJECTED',
      category: 'git_hooks',
      status: 'fail',
      message: `Hook '${name}' is a symbolic link (rejected for security).`,
      remediation: 'Run "aisdlc doctor --fix" to unlink and install canonical hook file.',
    };
  }
  if (fs.statSync(hookPath).size === 0) {
    return {
      id: 'ERR_HOOKS_EMPTY',
      category: 'git_hooks',
      status: 'fail',
      message: `Hook '${name}' is empty (0 bytes).`,
      remediation: 'Run "aisdlc doctor --fix" to install canonical script.',
    };
  }
  return null;
}

function checkFileStat(hookPath: string, name: HookName): DiagnosticFinding | null {
  return checkMissingHook(hookPath, name) || checkSymlinkOrEmpty(hookPath, name);
}

function checkFileContent(hookPath: string, name: HookName): DiagnosticFinding | null {
  const content = fs.readFileSync(hookPath, 'utf-8');
  const ok = name === 'pre-commit' ? checkPreCommitIntegrity(content) : checkPrepareCommitMsgIntegrity(content);
  return ok ? null : {
    id: 'ERR_HOOKS_TAMPERED',
    category: 'git_hooks',
    status: 'fail',
    message: `Hook ${name} is missing required AI-SDLC canonical logic.`,
    remediation: `Run "aisdlc doctor --fix" to restore canonical ${name} hook.`,
  };
}

function inspectHook(hooksDir: string, name: HookName): DiagnosticFinding | null {
  const hookPath = path.join(hooksDir, name);
  return checkFileStat(hookPath, name) || checkFileContent(hookPath, name);
}

function overwriteHook(hooksDir: string, name: HookName, script: string, stamp: number): void {
  const target = path.join(hooksDir, name);
  if (fs.existsSync(target) || isSymlink(target)) {
    if (isSymlink(target)) {
      fs.unlinkSync(target);
    } else {
      fs.copyFileSync(target, `${target}.bak.${stamp}`);
    }
  }
  fs.writeFileSync(target, script, { mode: 0o755 });
}

export class GitHooksHealthCheck {
  public async inspect(options: DoctorOptions): Promise<CategoryReport> {
    const root = options.rootDir || process.cwd();
    const hooksDir = path.join(root, '.git', 'hooks');

    if (!fs.existsSync(hooksDir)) {
      return this.missingDirReport();
    }

    let findings = this.scanHooks(hooksDir);
    if (options.fix && findings.length > 0) {
      this.fixHooks(hooksDir);
      findings = this.scanHooks(hooksDir);
    }

    const hasFail = findings.some((f) => f.status === 'fail');
    return {
      category: 'git_hooks',
      title: 'Git Hooks Integrity & Safety',
      status: hasFail ? 'fail' : findings.length > 0 ? 'warn' : 'pass',
      findings,
    };
  }

  private missingDirReport(): CategoryReport {
    return {
      category: 'git_hooks',
      title: 'Git Hooks Integrity & Safety',
      status: 'fail',
      findings: [{
        id: 'ERR_HOOKS_NOT_INSTALLED',
        category: 'git_hooks',
        status: 'fail',
        message: 'Git hooks directory .git/hooks is missing or not initialized.',
        remediation: 'Run "aisdlc doctor --fix" or "pnpm run git:hook:install" to initialize hooks.',
      }],
    };
  }

  private scanHooks(hooksDir: string): DiagnosticFinding[] {
    const findings: DiagnosticFinding[] = [];
    const f1 = inspectHook(hooksDir, 'pre-commit');
    if (f1) findings.push(f1);
    const f2 = inspectHook(hooksDir, 'prepare-commit-msg');
    if (f2) findings.push(f2);
    return findings;
  }

  private fixHooks(hooksDir: string): void {
    const stamp = Date.now();
    overwriteHook(hooksDir, 'pre-commit', PRE_COMMIT_SCRIPT, stamp);
    overwriteHook(hooksDir, 'prepare-commit-msg', PREPARE_COMMIT_MSG_SCRIPT, stamp);
  }
}
