/**
 * Cites: FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001
 * Cites: UC-061-INCREMENT-PROFILE-AND-SEMVER-GUARD
 */
import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  LIFECYCLE_SKILL_TEMPLATES,
  STARTER_GUARD_BRANCH_CJS,
} from '../src/init/index.js';

const repoRoot = path.resolve(__dirname, '../../..');
const guardScriptPath = path.join(repoRoot, 'scripts', 'guard-branch.cjs');

interface GuardOutput {
  decision: 'allow' | 'deny';
  reason?: string;
}

function resolveDeployedIncrementSkillFiles(rootDir: string): string[] {
  const candidates = [
    [path.join(rootDir, '.agent/skills/aisdlc-increment/SKILL.md')],
    [path.join(rootDir, '.claude/skills/aisdlc-increment/SKILL.md')],
    [
      path.join(rootDir, '.github/skills/aisdlc-increment/SKILL.md'),
      path.join(rootDir, '.github/agents/aisdlc-increment.agent.md'),
    ],
    [
      path.join(rootDir, '.cursor/rules/skill-aisdlc-increment.mdc'),
      path.join(rootDir, '.cursor/rules/aisdlc-increment.mdc'),
    ],
  ];

  const resolved: string[] = [];
  for (const group of candidates) {
    const existing = group.filter((filePath) => fs.existsSync(filePath));
    expect(existing.length, `Expected at least one deployed skill file in ${group.join(' or ')}`).toBeGreaterThan(0);
    resolved.push(...existing);
  }
  return resolved;
}

function initTempGitWorkspace(branchName: string, withSddChangesDir = true): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-guard-061-'));
  execFileSync('git', ['init'], { cwd: tmpDir, stdio: 'ignore' });
  execFileSync('git', ['checkout', '-b', branchName], { cwd: tmpDir, stdio: 'ignore' });
  if (withSddChangesDir) {
    fs.mkdirSync(path.join(tmpDir, 'specs', 'changes', 'active'), { recursive: true });
  }
  return tmpDir;
}

function runGuardHook(cwd: string, relTargetPath: string): GuardOutput {
  const targetAbs = path.join(cwd, relTargetPath);
  const input = JSON.stringify({
    toolCall: { args: { Path: targetAbs } },
    workspacePaths: [cwd],
  });
  const res = spawnSync('node', [guardScriptPath], { input, encoding: 'utf-8' });
  expect(res.status).toBe(0);
  return JSON.parse(res.stdout.trim()) as GuardOutput;
}

function writeChangeFiles(
  cwd: string,
  folderName: string,
  files: Record<string, string>
): void {
  const dir = path.join(cwd, 'specs', 'changes', 'active', folderName);
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content, 'utf-8');
  }
}

describe('CHG-061: Step 0 & Step 6 in LIFECYCLE_SKILL_TEMPLATES and Deployed IDE Skills', () => {
  it('includes Step 0 interactive friction profile triage (patch | standard | critical) and (Recommended) prompt rule', () => {
    const template = LIFECYCLE_SKILL_TEMPLATES.find((s) => s.id === 'aisdlc-increment');
    expect(template).toBeDefined();

    const deployedFiles = resolveDeployedIncrementSkillFiles(repoRoot);
    const sources = [
      { label: 'LIFECYCLE_SKILL_TEMPLATES(aisdlc-increment)', content: template!.body },
      ...deployedFiles.map((filePath) => ({
        label: path.relative(repoRoot, filePath),
        content: fs.readFileSync(filePath, 'utf-8'),
      })),
    ];

    for (const src of sources) {
      expect(src.content, `${src.label} must define ### Step 0:`).toMatch(/### Step 0:/);
      expect(src.content, `${src.label} must list patch | standard | critical`).toMatch(
        /patch\s*\|\s*standard\s*\|\s*critical/i
      );
      expect(src.content, `${src.label} must require (Recommended) option when asking user`).toContain(
        '(Recommended)'
      );
    }
  });

  it('documents Anti-Bypass protected paths and fast-track patch vs standard/critical SDD artifact rules in Step 0', () => {
    const template = LIFECYCLE_SKILL_TEMPLATES.find((s) => s.id === 'aisdlc-increment');
    expect(template).toBeDefined();

    const deployedFiles = resolveDeployedIncrementSkillFiles(repoRoot);
    const contents = [
      template!.body,
      ...deployedFiles.map((filePath) => fs.readFileSync(filePath, 'utf-8')),
    ];

    for (const content of contents) {
      expect(content).toContain('schemas/');
      expect(content).toContain('specs/security/');
      expect(content).toContain('SEC-ENC-');
      expect(content).toContain('09_decisions/');
      expect(content).toContain('migrations/');
      expect(content).toMatch(/\*?-policy\.yaml/);
      expect(content).toMatch(/--profile patch/);
      expect(content).toContain('spec.md');
      expect(content).toContain('verification');
      expect(content).toContain('proposal.md');
      expect(content).toContain('design.md');
      expect(content).toContain('tasks.md');
      expect(content).toContain('handoff.yaml');
    }
  });

  it('documents Step 6 profile-to-SemVer mapping and highest-precedence consolidation rule (critical > standard > patch)', () => {
    const template = LIFECYCLE_SKILL_TEMPLATES.find((s) => s.id === 'aisdlc-increment');
    expect(template).toBeDefined();

    const deployedFiles = resolveDeployedIncrementSkillFiles(repoRoot);
    const contents = [
      template!.body,
      ...deployedFiles.map((filePath) => fs.readFileSync(filePath, 'utf-8')),
    ];

    for (const content of contents) {
      expect(content).toMatch(/### Step 6:/);
      expect(content).toMatch(/x\.y\.Z/);
      expect(content).toMatch(/x\.Y\.0/);
      expect(content).toMatch(/X\.0\.0/);
      expect(content).toMatch(/critical.*>.*standard.*>.*patch|Major.*>.*Minor.*>.*Patch/is);
    }
  });
});

describe('CHG-061: Deterministic SDD Increment Guard in scripts/guard-branch.cjs and STARTER_GUARD_BRANCH_CJS', () => {
  let tempWorkspace = '';

  beforeEach(() => {
    tempWorkspace = '';
  });

  afterEach(() => {
    if (tempWorkspace && fs.existsSync(tempWorkspace)) {
      fs.rmSync(tempWorkspace, { recursive: true, force: true });
    }
  });

  it('maintains exact parity between scripts/guard-branch.cjs and STARTER_GUARD_BRANCH_CJS and exports hasValidActiveSddIncrement', () => {
    const scriptContent = fs.readFileSync(guardScriptPath, 'utf-8').replace(/\r\n/g, '\n').trim();
    const templateContent = STARTER_GUARD_BRANCH_CJS.replace(/\r\n/g, '\n').trim();
    expect(scriptContent).toBe(templateContent);
    expect(scriptContent).toContain('hasValidActiveSddIncrement');
  });

  it('1. denies editing src/app.ts or tests/app.spec.ts on feat/CHG-061-sample when specs/changes/active/ is empty', () => {
    tempWorkspace = initTempGitWorkspace('feat/CHG-061-sample', true);

    const srcDecision = runGuardHook(tempWorkspace, 'src/app.ts');
    expect(srcDecision.decision).toBe('deny');
    expect(srcDecision.reason).toContain('specs/changes/active/');
    expect(srcDecision.reason).toContain('aisdlc-increment');

    const testDecision = runGuardHook(tempWorkspace, 'tests/app.spec.ts');
    expect(testDecision.decision).toBe('deny');
    expect(testDecision.reason).toContain('specs/changes/active/');
  });

  it('2. denies editing src/app.ts on feat/CHG-999-new when specs/changes/active/ only contains an unrelated historical folder chg-009-old', () => {
    tempWorkspace = initTempGitWorkspace('feat/CHG-999-new', true);
    writeChangeFiles(tempWorkspace, 'chg-009-old', {
      'spec.md': '---\nprofile: standard\n---\n',
      'design.md': '# Design\n',
      'tasks.md': '# Tasks\n',
      'handoff.yaml': 'id: HOF-CHG-009-OLD\n',
    });

    const decision = runGuardHook(tempWorkspace, 'src/app.ts');
    expect(decision.decision).toBe('deny');
    expect(decision.reason).toMatch(/chg-999|specs\/changes\/active\//i);
  });

  it('3. denies editing src/app.ts on feat/CHG-061-sample when specs/changes/active/chg-061-sample has profile: standard but is missing design.md, tasks.md, or handoff.yaml', () => {
    tempWorkspace = initTempGitWorkspace('feat/CHG-061-sample', true);
    writeChangeFiles(tempWorkspace, 'chg-061-sample', {
      'spec.md': '---\nprofile: standard\n---\n# Spec\n',
      'design.md': '# Design\n',
    });

    const decision = runGuardHook(tempWorkspace, 'src/app.ts');
    expect(decision.decision).toBe('deny');
    expect(decision.reason).toMatch(/tasks\.md|handoff\.yaml|standard/i);
  });

  it('4. allows editing src/app.ts and tests/app.spec.ts on feat/CHG-061-sample when profile: standard has all 4 required artifacts', () => {
    tempWorkspace = initTempGitWorkspace('feat/CHG-061-sample', true);
    writeChangeFiles(tempWorkspace, 'chg-061-sample', {
      'spec.md': '---\nprofile: standard\n---\n# Spec\n',
      'design.md': '# Design\n',
      'tasks.md': '# Tasks\n',
      'handoff.yaml': 'id: HOF-CHG-061-SAMPLE\n',
    });

    expect(runGuardHook(tempWorkspace, 'src/app.ts').decision).toBe('allow');
    expect(runGuardHook(tempWorkspace, 'tests/app.spec.ts').decision).toBe('allow');
  });

  it('5. allows editing src/app.ts on patch/PATCH-061-fix when spec.md has profile: patch (including single or double quotes) without design/tasks/handoff', () => {
    tempWorkspace = initTempGitWorkspace('patch/PATCH-061-fix', true);

    for (const rawProfile of ['patch', "'patch'", '"patch"']) {
      writeChangeFiles(tempWorkspace, 'patch-061-fix', {
        'spec.md': `---\nprofile: ${rawProfile}\n---\n# Patch Spec\n`,
      });
      const res = runGuardHook(tempWorkspace, 'src/app.ts');
      expect(res.decision, `Expected allow for profile: ${rawProfile}`).toBe('allow');
    }
  });

  it('6. denies editing protected Anti-Bypass paths when active increment has profile: patch', () => {
    tempWorkspace = initTempGitWorkspace('feat/CHG-061-patch', true);
    writeChangeFiles(tempWorkspace, 'chg-061-patch', {
      'spec.md': '---\nprofile: "patch"\n---\n# Patch Spec\n',
    });

    for (const protectedPath of [
      'schemas/sdd/spec.schema.json',
      'specs/security/SEC-REQ-001.md',
      'quality-policy.yaml',
    ]) {
      const res = runGuardHook(tempWorkspace, protectedPath);
      expect(res.decision, `Expected deny on ${protectedPath} under patch profile`).toBe('deny');
      expect(res.reason).toMatch(/standard|critical|Anti-Bypass|patch/i);
    }
  });

  it('7. allows editing specs/product/UC-001.md, specs/architecture/CMP-CORE.md, and specs/security/SEC-REQ-001.md on a working branch when specs/changes/active/ has no active increment', () => {
    tempWorkspace = initTempGitWorkspace('feat/CHG-061-upstream', true);

    expect(runGuardHook(tempWorkspace, 'specs/product/UC-001.md').decision).toBe('allow');
    expect(runGuardHook(tempWorkspace, 'specs/architecture/CMP-CORE.md').decision).toBe('allow');
    expect(runGuardHook(tempWorkspace, 'specs/security/SEC-REQ-001.md').decision).toBe('allow');
  });

  it('8. allows editing src/app.ts on a working branch in a repository that has no specs/changes/ directory yet', () => {
    tempWorkspace = initTempGitWorkspace('feat/non-sdd-repo', false);

    expect(runGuardHook(tempWorkspace, 'src/app.ts').decision).toBe('allow');
  });
});
