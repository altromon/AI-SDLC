import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFileSync } from 'child_process';
import { runGitHookInstall } from '../src/commands/git.js';
import { runKpiPr, runKpiRelease } from '../src/commands/kpi.js';

describe('@ai-sdlc/cli KPI & Git Hook Commands', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-cli-kpi-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it('installs prepare-commit-msg hook in a git repository', () => {
    execFileSync('git', ['init'], { cwd: tmpDir, stdio: 'pipe' });
    const success = runGitHookInstall({ root: tmpDir });

    expect(success).toBe(true);
    const hookPath = path.join(tmpDir, '.git', 'hooks', 'prepare-commit-msg');
    expect(fs.existsSync(hookPath)).toBe(true);
    const content = fs.readFileSync(hookPath, 'utf-8');
    expect(content).toContain('AI-SDLC: Automated Commit Trailers Injection Hook');
  });

  it('fails gracefully when installing hook outside git repo', () => {
    const success = runGitHookInstall({ root: tmpDir });
    expect(success).toBe(false);
  });

  it('runs runKpiPr and updates an existing file with aggregated KPI summary', () => {
    // 1. Initialize git repo and make commits with trailers
    execFileSync('git', ['init'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['config', 'user.name', 'Tester'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['config', 'user.email', 'test@ai-sdlc.org'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['checkout', '-b', 'main'], { cwd: tmpDir, stdio: 'pipe' });

    fs.writeFileSync(path.join(tmpDir, 'file1.txt'), 'init');
    execFileSync('git', ['add', '.'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['commit', '-m', 'initial commit'], { cwd: tmpDir, stdio: 'pipe' });

    execFileSync('git', ['checkout', '-b', 'feat/feature-1'], { cwd: tmpDir, stdio: 'pipe' });
    fs.writeFileSync(path.join(tmpDir, 'file2.txt'), 'feature content');
    execFileSync('git', ['add', '.'], { cwd: tmpDir, stdio: 'pipe' });
    const commitMsg = `feat: add feature 2

Task-ID: TSK-001
Author-Type: agent
AI-Model: claude-3-7-sonnet
Prompt-Tokens: 10000
Completion-Tokens: 1200
Active-Time-Seconds: 300
`;
    const msgFile = path.join(tmpDir, 'commit-msg.txt');
    fs.writeFileSync(msgFile, commitMsg, 'utf-8');
    execFileSync('git', ['commit', '-F', msgFile], { cwd: tmpDir, stdio: 'pipe' });

    const prDocPath = path.join(tmpDir, 'PR_TEST.md');
    fs.writeFileSync(prDocPath, '## PR Description\n\nContent here.');

    const prSuccess = runKpiPr({
      base: 'main',
      head: 'HEAD',
      updateFile: prDocPath,
      root: tmpDir,
    });

    expect(prSuccess).toBe(true);
    const updatedPrDoc = fs.readFileSync(prDocPath, 'utf-8');
    expect(updatedPrDoc).toContain('AI-SDLC: Aggregated PR KPI Summary');
    expect(updatedPrDoc).toContain('claude-3-7-sonnet');
    expect(updatedPrDoc).toContain('11,200 tokens');
  });

  it('runs runKpiRelease and generates consolidated report in reports/releases/', () => {
    // 1. Initialize git repo and make commits
    execFileSync('git', ['init'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['config', 'user.name', 'Tester'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['config', 'user.email', 'test@ai-sdlc.org'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['checkout', '-b', 'main'], { cwd: tmpDir, stdio: 'pipe' });

    fs.writeFileSync(path.join(tmpDir, 'file1.txt'), 'init');
    execFileSync('git', ['add', '.'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['commit', '-m', 'initial commit'], { cwd: tmpDir, stdio: 'pipe' });

    execFileSync('git', ['checkout', '-b', 'release/v1.0.0'], { cwd: tmpDir, stdio: 'pipe' });
    fs.writeFileSync(path.join(tmpDir, 'code.txt'), 'production code');
    execFileSync('git', ['add', '.'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['commit', '-m', 'feat: initial release code\n\nAuthor-Type: human\nActive-Time-Seconds: 1200'], { cwd: tmpDir, stdio: 'pipe' });

    fs.writeFileSync(path.join(tmpDir, 'fix.txt'), 'fixed bug');
    execFileSync('git', ['add', '.'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['commit', '-m', 'fix: patch critical defect\n\nParent-Ref: BUG-001\nAuthor-Type: agent\nAI-Model: gpt-4o\nPrompt-Tokens: 5000\nCompletion-Tokens: 500\nActive-Time-Seconds: 300'], { cwd: tmpDir, stdio: 'pipe' });

    const outDir = path.join(tmpDir, 'reports', 'releases');
    const releaseSuccess = runKpiRelease({
      release: 'release/v1.0.0',
      base: 'main',
      output: outDir,
      root: tmpDir,
    });

    expect(releaseSuccess).toBe(true);
    expect(fs.existsSync(outDir)).toBe(true);
    const files = fs.readdirSync(outDir);
    expect(files.some((f) => f.startsWith('RELEASE_KPIS_'))).toBe(true);
    expect(files.some((f) => f.endsWith('.kpis.json'))).toBe(true);
  });
});
