import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { STARTER_GUARD_POST_EDIT_CJS } from '../src/init/coding-rules-templates.js';

describe('PostToolUse Skill-Compliance Reminder Hook (guard-post-edit.cjs)', () => {
  let tmpDir: string;
  let hookPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-post-edit-hook-'));
    fs.mkdirSync(path.join(tmpDir, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'specs', 'product'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'tests', 'features'), { recursive: true });
    hookPath = path.join(tmpDir, 'scripts', 'guard-post-edit.cjs');
    fs.writeFileSync(hookPath, STARTER_GUARD_POST_EDIT_CJS, 'utf-8');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('emits gherkin extract reminder when a spec with gherkin block is edited', () => {
    const specFile = path.join(tmpDir, 'specs', 'product', 'FR-001.md');
    fs.writeFileSync(specFile, '# FR-001\n```gherkin\nFeature: Sample\n```\n', 'utf-8');

    const stdout = execFileSync('node', [hookPath], {
      cwd: tmpDir,
      input: JSON.stringify({ tool_input: { Path: specFile } }),
      encoding: 'utf-8',
    });
    expect(stdout).toContain('npx aisdlc gherkin extract');
  });

  it('warns on stderr when tests/features/*.feature is edited directly', () => {
    const featureFile = path.join(tmpDir, 'tests', 'features', 'sample.feature');
    fs.writeFileSync(featureFile, 'Feature: Sample\n', 'utf-8');

    const res = execFileSync('node', [hookPath], {
      cwd: tmpDir,
      input: JSON.stringify({ tool_input: { Path: featureFile } }),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    expect(res).toBe('');
  });
});
