import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  checkoutTaskBranch,
  locateTaskInActiveChanges,
  resolveBranchHierarchy,
} from '../src/git/checkout.js';

describe('Git Checkout & Task Locator Paths (Happy / Sad / Boundary / Malformed)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-git-checkout-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('locateTaskInActiveChanges: rejects empty taskId and missing active dir (boundary/sad)', () => {
    expect(locateTaskInActiveChanges('', tmpDir).found).toBe(false);
    expect(locateTaskInActiveChanges('   ', tmpDir).error).toContain('identificador');
    expect(locateTaskInActiveChanges('TSK-001', tmpDir).found).toBe(false);
    expect(locateTaskInActiveChanges('TSK-001', tmpDir).error).toContain('directorio de cambios activos');
  });

  it('locateTaskInActiveChanges: locates matching task and lists available tasks when not found (happy/sad)', () => {
    const chgDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-099-sample');
    fs.mkdirSync(chgDir, { recursive: true });
    fs.writeFileSync(
      path.join(chgDir, 'tasks.md'),
      '---\nchange-id: CHG-099\nversion: 1.2.0\ntasks:\n  - id: TSK-001\n    title: Implement DTO\n  - id: TSK-002\n    title: Write tests\n---\n# Tasks\n',
      'utf-8'
    );

    const hit = locateTaskInActiveChanges('TSK-001', tmpDir);
    expect(hit.found).toBe(true);
    expect(hit.match?.taskId).toBe('TSK-001');
    expect(hit.match?.changeId).toBe('CHG-099');

    const miss = locateTaskInActiveChanges('TSK-999', tmpDir);
    expect(miss.found).toBe(false);
    expect(miss.availableTasks?.some((t) => t.id === 'TSK-001')).toBe(true);
  });

  it('resolveBranchHierarchy & checkoutTaskBranch: resolves hierarchy fallback and handles non-git repo failure (happy/sad)', () => {
    const chgDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-099-sample');
    fs.mkdirSync(chgDir, { recursive: true });
    fs.writeFileSync(
      path.join(chgDir, 'tasks.md'),
      '---\nchange-id: CHG-099\ntasks:\n  - id: TSK-001\n    title: Implement DTO\n---\n# Tasks\n',
      'utf-8'
    );

    const located = locateTaskInActiveChanges('TSK-001', tmpDir);
    expect(located.match).toBeDefined();

    const hierarchy = resolveBranchHierarchy(located.match!, tmpDir);
    expect(hierarchy.baseBranch).toBe('main');
    expect(hierarchy.releaseBranch).toMatch(/^release\/v/);
    expect(hierarchy.featureBranch).toMatch(/^feat\//);
    expect(hierarchy.taskBranch).toMatch(/^task\//);

    expect(checkoutTaskBranch('', { rootDir: tmpDir }).success).toBe(false);
    const notGitRes = checkoutTaskBranch('TSK-001', { rootDir: tmpDir });
    expect(notGitRes.success).toBe(false);
  });
});
