/**
 * Cites: FR-040-RELEASE-SUPPLY-CHAIN-PROVENANCE-001
 * Tag: @FR-040-RELEASE-SUPPLY-CHAIN-PROVENANCE-001
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFileSync } from 'child_process';
import { runGitCheckout } from '../src/commands/git.js';

describe('@aisdlc/cli runGitCheckout command', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-cli-git-test-'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    } catch {
      // Cleanup fallback
    }
  });

  it('should return false if no taskId or whitespace taskId is provided', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(runGitCheckout('', { silent: true })).toBe(false);
    expect(runGitCheckout('   ', { silent: false })).toBe(false);
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Task identifier to navigate must be specified'));
  });

  it('should return false if task is not found in active changes', () => {
    const passed = runGitCheckout('TSK-999', { root: tmpDir, silent: true });
    expect(passed).toBe(false);
  });

  it('should execute successfully for an existing task in a git repository', () => {
    // 1. Initialize git repo
    execFileSync('git', ['init'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['config', 'user.name', 'CLI Test'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['config', 'user.email', 'cli@ai-sdlc.org'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['checkout', '-b', 'main'], { cwd: tmpDir, stdio: 'pipe' });
    fs.writeFileSync(path.join(tmpDir, 'init.txt'), 'hello');
    execFileSync('git', ['add', '.'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['commit', '-m', 'initial commit'], { cwd: tmpDir, stdio: 'pipe' });

    // 2. Add active change
    const activeDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-014-git-checkout');
    fs.mkdirSync(activeDir, { recursive: true });
    fs.writeFileSync(
      path.join(activeDir, 'tasks.md'),
      `---
id: TSK-PLAN-CHG-014
change-id: CHG-014-GIT-CHECKOUT
version: 1.0.0
tasks:
  - id: TSK-001
    title: Motor de resolución
---
# Tasks
`
    );
    execFileSync('git', ['add', '.'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['commit', '-m', 'chore: add tasks.md'], { cwd: tmpDir, stdio: 'pipe' });

    // 3. Run CLI command
    const passed = runGitCheckout('TSK-001', { root: tmpDir, silent: true });
    expect(passed).toBe(true);

    // Verify checked-out branch
    const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: tmpDir,
      encoding: 'utf-8',
    }).trim();
    expect(branch).toMatch(/^task\/CHG-014\/tsk-001/);
  });
});
