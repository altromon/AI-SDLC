/**
 * Cites: FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001
 * Cites: UC-061-INCREMENT-PROFILE-AND-SEMVER-GUARD
 * Cites: SPEC-CHG-067-SEMVER-FRICTION-PROFILES
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  detectProfileFromChange,
  scaffoldSddChange,
  VALID_CHANGE_PROFILES,
  validateArtifactSchema,
  verifyProgressiveFriction,
} from '../src/index.js';
import { LIFECYCLE_SKILL_TEMPLATES } from '../src/init/index.js';
import { SKILL_REFERENCES } from '../src/init/skill-references.js';
import { validateScaffoldProfile } from '../src/adapters/sdd/scaffold.js';
import { parseSpecFrontmatter } from '../src/verifiers/progressive-friction.js';

const repoRoot = path.resolve(__dirname, '../../..');
const specSchemaPath = path.join(repoRoot, 'schemas', 'sdd', 'spec.schema.json');
const specTemplatePath = path.join(repoRoot, 'templates', 'sdd', 'spec.template.md');
const guardScriptPath = path.join(repoRoot, 'scripts', 'guard-branch.cjs');

interface GuardOutput {
  decision: 'allow' | 'deny';
  reason?: string;
}

function initTempGitWorkspace(branchName: string): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-chg067-'));
  execFileSync('git', ['init'], { cwd: tmpDir, stdio: 'ignore' });
  execFileSync('git', ['checkout', '-b', branchName], { cwd: tmpDir, stdio: 'ignore' });
  fs.mkdirSync(path.join(tmpDir, 'specs', 'changes', 'active'), { recursive: true });
  return tmpDir;
}

function writeChangeFiles(
  cwd: string,
  folderName: string,
  files: Record<string, string>
): string {
  const dir = path.join(cwd, 'specs', 'changes', 'active', folderName);
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content, 'utf-8');
  }
  return dir;
}

describe('CHG-067: SemVer Friction Profiles (patch | minor | major)', () => {
  const tempDirs: string[] = [];

  function trackTempDir(dir: string): string {
    tempDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir && fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  it('a) schemas/sdd/spec.schema.json defines profile enum [patch, minor, major] and rejects standard/critical', () => {
    const schema = JSON.parse(fs.readFileSync(specSchemaPath, 'utf-8')) as {
      properties: { profile: { enum: string[] } };
    };
    expect(schema.properties.profile.enum).toEqual(['patch', 'minor', 'major']);

    for (const validProfile of ['patch', 'minor', 'major']) {
      const res = validateArtifactSchema(
        {
          id: 'SPEC-CHG-067-TEST',
          type: 'delivery-spec',
          'change-id': 'CHG-067-TEST',
          profile: validProfile,
        },
        'delivery-spec',
        repoRoot
      );
      expect(res.valid, `Expected schema to accept profile '${validProfile}'`).toBe(true);
    }

    expect(validateScaffoldProfile(undefined)).toBeUndefined();
    expect(validateScaffoldProfile('minor')).toBeUndefined();
    expect(validateScaffoldProfile('standard')).toMatch(/Invalid change profile/);

    for (const legacyProfile of ['standard', 'critical']) {
      const res = validateArtifactSchema(
        {
          id: 'SPEC-CHG-067-TEST',
          type: 'delivery-spec',
          'change-id': 'CHG-067-TEST',
          profile: legacyProfile,
        },
        'delivery-spec',
        repoRoot
      );
      expect(res.valid, `Expected schema to reject legacy profile '${legacyProfile}'`).toBe(false);
    }
  });

  it('b) VALID_CHANGE_PROFILES equals [patch, minor, major]', () => {
    expect(VALID_CHANGE_PROFILES).toEqual(['patch', 'minor', 'major']);
  });

  it('c) progressive-friction accepts patch/minor/major, defaults omitted to minor, and fails closed on standard/critical', () => {
    const ws = trackTempDir(initTempGitWorkspace('feat/CHG-067-friction'));

    for (const validProfile of ['patch', 'minor', 'major']) {
      const changeDir = writeChangeFiles(ws, `chg-067-${validProfile}`, {
        'spec.md': `---\nprofile: ${validProfile}\n---\n# Spec\n`,
      });
      expect(detectProfileFromChange(changeDir)).toBe(validProfile);

      const result = verifyProgressiveFriction({
        rootDir: ws,
        changeDir,
        diffFiles: ['packages/core/src/example.ts'],
      });
      expect(result.success).toBe(true);
      expect(result.profile).toBe(validProfile);
    }

    // Default when profile is omitted resolves to 'minor'
    const omittedDir = writeChangeFiles(ws, 'chg-067-omitted', {
      'spec.md': '---\nid: SPEC-CHG-067-OMITTED\n---\n# Spec\n',
    });
    expect(parseSpecFrontmatter(path.join(omittedDir, 'spec.md'))).toEqual({ id: 'SPEC-CHG-067-OMITTED' });
    expect(detectProfileFromChange(omittedDir)).toBe('minor');

    // Legacy profiles must fail closed (no silent fallback to 'minor')
    expect(validateScaffoldProfile(undefined)).toBeUndefined();
    expect(validateScaffoldProfile('minor')).toBeUndefined();
    expect(validateScaffoldProfile('standard')).toMatch(/Invalid change profile/);

    for (const legacyProfile of ['standard', 'critical']) {
      const legacyDir = writeChangeFiles(ws, `chg-067-${legacyProfile}`, {
        'spec.md': `---\nprofile: ${legacyProfile}\n---\n# Spec\n`,
      });
      let threw = false;
      let frictionRes: ReturnType<typeof verifyProgressiveFriction> | undefined;
      try {
        frictionRes = verifyProgressiveFriction({
          rootDir: ws,
          changeDir: legacyDir,
          diffFiles: ['packages/core/src/example.ts'],
        });
      } catch {
        threw = true;
      }
      const failedClosed =
        threw || (frictionRes !== undefined && !frictionRes.success);
      expect(
        failedClosed,
        `Expected progressive-friction to fail closed on legacy profile '${legacyProfile}'`
      ).toBe(true);
    }

    // Anti-bypass under patch requires 'minor' or 'major'
    const patchDir = path.join(ws, 'specs', 'changes', 'active', 'chg-067-patch');
    const bypassRes = verifyProgressiveFriction({
      rootDir: ws,
      changeDir: patchDir,
      diffFiles: ['schemas/sdd/spec.schema.json'],
    });
    expect(bypassRes.success).toBe(false);
    expect(bypassRes.violations.join('\n')).toMatch(/minor|major/i);
    expect(bypassRes.violations.join('\n')).not.toMatch(/standard|critical/i);
  });

  it('d) scripts/guard-branch.cjs accepts patch/minor/major, defaults omitted to minor, and denies standard/critical', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const guard = require(guardScriptPath) as {
      evaluateGuardDecision: (payload: {
        toolCall: { args: { Path: string } };
        workspacePaths: string[];
      }) => GuardOutput;
      detectChangeDirProfile: (changeDir: string) => string;
    };

    for (const validProfile of ['patch', 'minor', 'major']) {
      const ws = trackTempDir(initTempGitWorkspace('feat/CHG-067-guard'));
      const files: Record<string, string> = {
        'spec.md': `---\nprofile: ${validProfile}\n---\n# Spec\n`,
      };
      if (validProfile !== 'patch') {
        files['design.md'] = '# Design\n';
        files['tasks.md'] = '# Tasks\n';
        files['handoff.yaml'] = 'id: HOF-CHG-067-GUARD\n';
      }
      const changeDir = writeChangeFiles(ws, 'chg-067-guard', files);
      expect(guard.detectChangeDirProfile(changeDir)).toBe(validProfile);

      const decision = guard.evaluateGuardDecision({
        toolCall: { args: { Path: path.join(ws, 'src', 'app.ts') } },
        workspacePaths: [ws],
      });
      expect(decision.decision, `Expected allow for profile '${validProfile}'`).toBe('allow');
    }

    // Omitted profile defaults to 'minor'
    const wsOmitted = trackTempDir(initTempGitWorkspace('feat/CHG-067-omitted'));
    const omittedDir = writeChangeFiles(wsOmitted, 'chg-067-omitted', {
      'spec.md': '---\nid: SPEC-CHG-067-OMITTED\n---\n# Spec\n',
      'design.md': '# Design\n',
      'tasks.md': '# Tasks\n',
      'handoff.yaml': 'id: HOF-CHG-067-OMITTED\n',
    });
    expect(guard.detectChangeDirProfile(omittedDir)).toBe('minor');

    // Legacy standard / critical must be denied (no silent fallback to 'minor')
    expect(validateScaffoldProfile(undefined)).toBeUndefined();
    expect(validateScaffoldProfile('minor')).toBeUndefined();
    expect(validateScaffoldProfile('standard')).toMatch(/Invalid change profile/);

    for (const legacyProfile of ['standard', 'critical']) {
      const wsLegacy = trackTempDir(initTempGitWorkspace('feat/CHG-067-legacy'));
      writeChangeFiles(wsLegacy, 'chg-067-legacy', {
        'spec.md': `---\nprofile: ${legacyProfile}\n---\n# Spec\n`,
        'design.md': '# Design\n',
        'tasks.md': '# Tasks\n',
        'handoff.yaml': 'id: HOF-CHG-067-LEGACY\n',
      });
      const decision = guard.evaluateGuardDecision({
        toolCall: { args: { Path: path.join(wsLegacy, 'src', 'app.ts') } },
        workspacePaths: [wsLegacy],
      });
      expect(decision.decision, `Expected deny for legacy profile '${legacyProfile}'`).toBe('deny');
    }
  });

  it('e) scaffoldSddChange accepts patch/minor/major, defaults omitted to minor, and rejects standard/critical', () => {
    for (const validProfile of ['patch', 'minor', 'major'] as const) {
      const ws = trackTempDir(fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-scaffold-067-')));
      const res = scaffoldSddChange({
        rootDir: ws,
        name: `Test ${validProfile} change`,
        profile: validProfile,
        silent: true,
      });
      expect(res.success).toBe(true);
      expect(res.profile).toBe(validProfile);
    }

    const wsDefault = trackTempDir(fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-scaffold-067-')));
    const defaultRes = scaffoldSddChange({
      rootDir: wsDefault,
      name: 'Default profile change',
      silent: true,
    });
    expect(defaultRes.success).toBe(true);
    expect(defaultRes.profile).toBe('minor');

    expect(validateScaffoldProfile(undefined)).toBeUndefined();
    expect(validateScaffoldProfile('minor')).toBeUndefined();
    expect(validateScaffoldProfile('standard')).toMatch(/Invalid change profile/);

    for (const legacyProfile of ['standard', 'critical']) {
      const wsLegacy = trackTempDir(fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-scaffold-067-')));
      let threw = false;
      let res: ReturnType<typeof scaffoldSddChange> | undefined;
      try {
        res = scaffoldSddChange({
          rootDir: wsLegacy,
          name: `Legacy ${legacyProfile} change`,
          profile: legacyProfile as unknown as 'minor',
          silent: true,
        });
      } catch {
        threw = true;
      }
      const rejected = threw || (res !== undefined && !res.success);
      expect(rejected, `Expected scaffoldSddChange to reject '${legacyProfile}'`).toBe(true);
    }
  });

  it('f) templates/sdd/spec.template.md and agent-templates.ts use patch | minor | major without standard/critical', () => {
    const specTemplate = fs.readFileSync(specTemplatePath, 'utf-8');
    expect(specTemplate).toMatch(/profile:\s*minor/);
    expect(specTemplate).not.toMatch(/profile:\s*(standard|critical)/);
    expect(specTemplate).not.toMatch(/standard,\s*patch,\s*critical/i);

    const incrementTpl = LIFECYCLE_SKILL_TEMPLATES.find((s) => s.id === 'aisdlc-increment');
    expect(incrementTpl).toBeDefined();
    expect(incrementTpl!.body).toMatch(/patch\s*\|\s*minor\s*\|\s*major/i);
    expect(incrementTpl!.body).not.toMatch(/patch\s*\|\s*standard\s*\|\s*critical/i);
    expect(incrementTpl!.body).not.toMatch(/critical.*>.*standard.*>.*patch/i);

    const releaseTpl = LIFECYCLE_SKILL_TEMPLATES.find((s) => s.id === 'aisdlc-release-compliance');
    expect(releaseTpl).toBeDefined();
    expect(releaseTpl!.body).toMatch(/major\s*>\s*minor\s*>\s*patch/i);
    expect(releaseTpl!.body).not.toMatch(/critical.*>.*standard.*>.*patch/i);

    const refContents = [
      ...(SKILL_REFERENCES['aisdlc-increment'] || []).map((r) => r.content),
      ...(SKILL_REFERENCES['aisdlc-release-compliance'] || []).map((r) => r.content),
      fs.readFileSync(
        path.join(repoRoot, '.agent', 'skills', 'aisdlc-increment', 'references', 'sdd-lifecycle-and-gates.md'),
        'utf-8'
      ),
      fs.readFileSync(
        path.join(repoRoot, '.agent', 'skills', 'aisdlc-release-compliance', 'references', 'regulatory-bundles-and-semver.md'),
        'utf-8'
      ),
    ];
    for (const content of refContents) {
      expect(content).not.toMatch(/\b(standard|critical)\b/i);
    }
  });
});
