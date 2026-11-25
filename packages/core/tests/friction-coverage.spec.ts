import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  detectProfileFromChange,
  isPathProtectedFromPatch,
  verifyProgressiveFriction,
} from '../src/verifiers/progressive-friction.js';

describe('Progressive Friction & Anti-Bypass Branch Coverage Suite', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-friction-cov-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('detects profiles, protected paths, and anti-patch-bypass violations across git and options', () => {
    expect(detectProfileFromChange(path.join(tempDir, 'missing'))).toBe('minor');

    const chgPatch = path.join(tempDir, 'specs', 'changes', 'active', 'chg-101');
    fs.mkdirSync(chgPatch, { recursive: true });
    fs.writeFileSync(path.join(chgPatch, 'spec.md'), '---\nprofile: patch\n---\n# Patch', 'utf-8');
    expect(detectProfileFromChange(chgPatch)).toBe('patch');

    const chgBad = path.join(tempDir, 'specs', 'changes', 'active', 'chg-bad');
    fs.mkdirSync(chgBad, { recursive: true });
    fs.writeFileSync(path.join(chgBad, 'spec.md'), '---\n: : [\n---\n# Bad', 'utf-8');
    expect(detectProfileFromChange(chgBad)).toBe('minor');

    expect(isPathProtectedFromPatch('schemas/product/req.schema.json')).toBe(true);
    expect(isPathProtectedFromPatch('src/app.ts')).toBe(false);

    // Explicit changeDir + protected modifiedFiles -> BLOCKED
    const blocked = verifyProgressiveFriction({
      rootDir: tempDir,
      changeDir: chgPatch,
      modifiedFiles: [path.join(tempDir, 'quality-policy.yaml'), 'src/app.ts'],
    });
    expect(blocked.success).toBe(false);
    expect(blocked.profile).toBe('patch');
    expect(blocked.reportMarkdown).toContain('BLOCKED');

    // Explicit changeId + safe modifiedFiles -> COMPLIANT
    const passed = verifyProgressiveFriction({
      rootDir: tempDir,
      changeId: 'chg-101',
      modifiedFiles: ['src/app.ts'],
    });
    expect(passed.success).toBe(true);
    expect(passed.reportMarkdown).toContain('COMPLIANT');

    // Git repo detection with untracked + modified files
    execFileSync('git', ['init'], { cwd: tempDir, stdio: 'ignore' });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: tempDir, stdio: 'ignore' });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: tempDir, stdio: 'ignore' });
    fs.writeFileSync(path.join(tempDir, 'README.md'), 'hi', 'utf-8');
    execFileSync('git', ['add', 'README.md'], { cwd: tempDir, stdio: 'ignore' });
    execFileSync('git', ['commit', '-m', 'init'], { cwd: tempDir, stdio: 'ignore' });
    execFileSync('git', ['checkout', '-b', 'patch/chg-101'], { cwd: tempDir, stdio: 'ignore' });

    fs.mkdirSync(path.join(tempDir, 'scratch'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'scratch', 'tmp.txt'), 'ignored', 'utf-8');
    fs.writeFileSync(path.join(tempDir, 'license-policy.yaml'), 'rules: []', 'utf-8');

    const gitRes = verifyProgressiveFriction({ rootDir: tempDir });
    expect(gitRes.success).toBe(false);
    expect(gitRes.profile).toBe('patch');
  });
});
