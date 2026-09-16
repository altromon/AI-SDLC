import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFileSync } from 'child_process';
import {
  locateTaskInActiveChanges,
  resolveBranchHierarchy,
  checkoutTaskBranch,
  classifyBranch,
} from '../src/index.js';

describe('4-Tier Git Checkout & Branch Cascading Engine', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-git-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Cleanup fallback
    }
  });

  it('should return error when active changes directory does not exist', () => {
    const res = locateTaskInActiveChanges('TSK-001', tmpDir);
    expect(res.found).toBe(false);
    expect(res.error).toContain('No se encontró el directorio de cambios activos');
  });

  it('should return available tasks when task ID is not found', () => {
    const activeDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-001-demo');
    fs.mkdirSync(activeDir, { recursive: true });
    fs.writeFileSync(
      path.join(activeDir, 'tasks.md'),
      `---
id: TSK-PLAN-CHG-001
change-id: CHG-001-DEMO
version: 1.2.0
tasks:
  - id: TSK-001
    title: Tarea Uno
  - id: TSK-002
    title: Tarea Dos
---
# Tasks
`
    );

    const res = locateTaskInActiveChanges('TSK-999', tmpDir);
    expect(res.found).toBe(false);
    expect(res.error).toContain("No se encontró la tarea 'TSK-999'");
    expect(res.availableTasks).toBeDefined();
    expect(res.availableTasks?.length).toBe(2);
    expect(res.availableTasks?.[0].id).toBe('TSK-001');
    expect(res.availableTasks?.[1].id).toBe('TSK-002');
  });

  it('should locate task matching case-insensitively', () => {
    const activeDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-014-checkout');
    fs.mkdirSync(activeDir, { recursive: true });
    fs.writeFileSync(
      path.join(activeDir, 'tasks.md'),
      `---
id: TSK-PLAN-CHG-014
change-id: CHG-014-CHECKOUT
version: 1.0.0
tasks:
  - id: TSK-001
    title: Navegacion automatica
---
# Tasks
`
    );

    const res = locateTaskInActiveChanges('tsk-001', tmpDir);
    expect(res.found).toBe(true);
    expect(res.match?.taskId).toBe('TSK-001');
    expect(res.match?.changeId).toBe('CHG-014-CHECKOUT');
    expect(res.match?.version).toBe('1.0.0');
  });

  it('should resolve branch hierarchy strictly adhering to 4-tier model', () => {
    const activeDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-014-git-checkout');
    fs.mkdirSync(activeDir, { recursive: true });
    const match = {
      taskId: 'TSK-001',
      taskTitle: 'Motor de resolución de ramas',
      changeId: 'CHG-014-GIT-CHECKOUT',
      changeDir: activeDir,
      version: '1.2.3',
    };

    const hierarchy = resolveBranchHierarchy(match, tmpDir);

    expect(hierarchy.baseBranch).toBe('main');
    expect(hierarchy.releaseBranch).toBe('release/v1.2.3');
    expect(hierarchy.featureBranch).toBe('feat/CHG-014-git-checkout');
    expect(hierarchy.taskBranch).toBe('task/CHG-014/tsk-001-motor-de-resolucion-de');

    // Validate tiers
    const releaseValidation = classifyBranch(hierarchy.releaseBranch);
    expect(releaseValidation.valid).toBe(true);
    if (releaseValidation.valid) expect(releaseValidation.tier).toBe(2);

    const featValidation = classifyBranch(hierarchy.featureBranch);
    expect(featValidation.valid).toBe(true);
    if (featValidation.valid) expect(featValidation.tier).toBe(3);

    const taskValidation = classifyBranch(hierarchy.taskBranch);
    expect(taskValidation.valid).toBe(true);
    if (taskValidation.valid) expect(taskValidation.tier).toBe(4);
  });

  it('should execute cascading branch creation and checkout in a real git repository', () => {
    // 1. Initialize isolated git repository
    execFileSync('git', ['init'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['config', 'user.name', 'AI-SDLC Test'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['config', 'user.email', 'test@ai-sdlc.org'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['checkout', '-b', 'main'], { cwd: tmpDir, stdio: 'pipe' });

    // Initial commit
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '# AI-SDLC Test Repo');
    execFileSync('git', ['add', '.'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['commit', '-m', 'initial commit on main'], { cwd: tmpDir, stdio: 'pipe' });

    // 2. Setup active SDD change
    const activeDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-042-auth-gateway');
    fs.mkdirSync(activeDir, { recursive: true });
    fs.writeFileSync(
      path.join(activeDir, 'tasks.md'),
      `---
id: TSK-PLAN-CHG-042
change-id: CHG-042-AUTH-GATEWAY
version: 2.0.0
tasks:
  - id: TSK-001
    title: Gateway Interfaces DTO
  - id: TSK-002
    title: Handshake Implementation
---
# Tasks
`
    );
    execFileSync('git', ['add', '.'], { cwd: tmpDir, stdio: 'pipe' });
    execFileSync('git', ['commit', '-m', 'chore: add SDD change specs'], { cwd: tmpDir, stdio: 'pipe' });

    // 3. First checkout: TSK-001 (should create release, feat, and task in cascade)
    const res1 = checkoutTaskBranch('TSK-001', { rootDir: tmpDir });
    expect(res1.success).toBe(true);
    expect(res1.releaseBranch).toBe('release/v2.0.0');
    expect(res1.featureBranch).toBe('feat/CHG-042-auth-gateway');
    expect(res1.taskBranch).toBe('task/CHG-042/tsk-001-gateway-interfaces-dto');
    expect(res1.createdBranches).toEqual([
      'release/v2.0.0',
      'feat/CHG-042-auth-gateway',
      'task/CHG-042/tsk-001-gateway-interfaces-dto',
    ]);

    // Verify current branch in git
    const currentBranch1 = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: tmpDir,
      encoding: 'utf-8',
    }).trim();
    expect(currentBranch1).toBe(res1.taskBranch);

    // 4. Second checkout: TSK-002 (release and feat already exist, only task created)
    const res2 = checkoutTaskBranch('TSK-002', { rootDir: tmpDir });
    expect(res2.success).toBe(true);
    expect(res2.createdBranches).toEqual(['task/CHG-042/tsk-002-handshake-implementation']);

    const currentBranch2 = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: tmpDir,
      encoding: 'utf-8',
    }).trim();
    expect(currentBranch2).toBe(res2.taskBranch);

    // 5. Third checkout: TSK-001 again (all exist, 0 branches created, simply checkout)
    const res3 = checkoutTaskBranch('TSK-001', { rootDir: tmpDir });
    expect(res3.success).toBe(true);
    expect(res3.createdBranches).toEqual([]);

    const currentBranch3 = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: tmpDir,
      encoding: 'utf-8',
    }).trim();
    expect(currentBranch3).toBe(res1.taskBranch);
  });
});
