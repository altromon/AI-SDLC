// BDD STEP DEFINITIONS (tests/features/spec-chg-067-semver-friction-profiles.feature)
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  BddStepRegistry,
  detectProfileFromChange,
  VALID_CHANGE_PROFILES,
  validateArtifactSchema,
  verifyProgressiveFriction,
} from '@aisdlc/core';

interface StepContext {
  profile?: string;
  tempDirs: string[];
  schemaValid?: boolean;
  typesValid?: boolean;
  frictionSuccess?: boolean;
  resolvedProfile?: string;
  guardDecision?: 'allow' | 'deny';
  guardReason?: string;
  frictionViolations: string[];
}

function createTempSddWorkspace(branchName: string, folderName: string, specContent: string, fullArtifacts = false): {
  ws: string;
  changeDir: string;
} {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-bdd-067-'));
  execFileSync('git', ['init'], { cwd: ws, stdio: 'ignore' });
  execFileSync('git', ['checkout', '-b', branchName], { cwd: ws, stdio: 'ignore' });
  const changeDir = path.join(ws, 'specs', 'changes', 'active', folderName);
  fs.mkdirSync(changeDir, { recursive: true });
  fs.writeFileSync(path.join(changeDir, 'spec.md'), specContent, 'utf-8');
  if (fullArtifacts) {
    fs.writeFileSync(path.join(changeDir, 'design.md'), '# Design\n', 'utf-8');
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), '# Tasks\n', 'utf-8');
    fs.writeFileSync(path.join(changeDir, 'handoff.yaml'), 'id: HOF-CHG-067-BDD\n', 'utf-8');
  }
  return { ws, changeDir };
}

function cleanupTempDirs(ctx: StepContext): void {
  while (ctx.tempDirs.length > 0) {
    const dir = ctx.tempDirs.pop();
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
}

export function registerSteps(registry: BddStepRegistry): void {
  const ctx: StepContext = { tempDirs: [], frictionViolations: [] };
  const repoRoot = process.cwd();
  const guardScriptPath = path.join(repoRoot, 'scripts', 'guard-branch.cjs');

  registry.given(/^the system is configured with the SemVer friction profile "([^"]+)"$/, (args) => {
    ctx.profile = args[0];
  });

  registry.when(
    'profile validation is executed across schema, types, CLI, MCP, progressive-friction, and guard-branch.cjs',
    () => {
      const profile = ctx.profile ?? '';
      const schemaRes = validateArtifactSchema(
        { id: 'SPEC-CHG-067-BDD', type: 'delivery-spec', 'change-id': 'CHG-067-BDD', profile },
        'delivery-spec',
        repoRoot
      );
      ctx.schemaValid = schemaRes.valid;
      ctx.typesValid = (VALID_CHANGE_PROFILES as readonly string[]).includes(profile);

      const { ws, changeDir } = createTempSddWorkspace(
        'feat/CHG-067-bdd',
        'chg-067-bdd',
        `---\nprofile: ${profile}\n---\n# Spec\n`,
        profile !== 'patch'
      );
      ctx.tempDirs.push(ws);

      const frictionRes = verifyProgressiveFriction({
        rootDir: ws,
        changeDir,
        diffFiles: ['packages/core/src/example.ts'],
      });
      ctx.frictionSuccess = frictionRes.success;

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const guard = require(guardScriptPath) as {
        evaluateGuardDecision: (p: { toolCall: { args: { Path: string } }; workspacePaths: string[] }) => {
          decision: 'allow' | 'deny';
          reason?: string;
        };
      };
      const guardOut = guard.evaluateGuardDecision({
        toolCall: { args: { Path: path.join(ws, 'src', 'app.ts') } },
        workspacePaths: [ws],
      });
      ctx.guardDecision = guardOut.decision;
      ctx.guardReason = guardOut.reason;
      cleanupTempDirs(ctx);
    }
  );

  registry.then(/^the profile "([^"]+)" is accepted without errors$/, (args) => {
    const profile = args[0];
    assert.equal(ctx.schemaValid, true, `Schema must accept '${profile}'`);
    assert.equal(ctx.typesValid, true, `VALID_CHANGE_PROFILES must include '${profile}'`);
    assert.equal(ctx.frictionSuccess, true, `progressive-friction must accept '${profile}'`);
    assert.equal(ctx.guardDecision, 'allow', `guard-branch.cjs must allow '${profile}'`);
  });

  registry.given('an SDD change without an explicit profile field', () => {
    ctx.profile = undefined;
  });

  registry.when('the effective profile is resolved by progressive-friction and guard-branch.cjs', () => {
    const { ws, changeDir } = createTempSddWorkspace(
      'feat/CHG-067-omitted',
      'chg-067-omitted',
      '---\nid: SPEC-CHG-067-OMITTED\n---\n# Spec\n',
      true
    );
    ctx.tempDirs.push(ws);
    ctx.resolvedProfile = detectProfileFromChange(changeDir);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const guard = require(guardScriptPath) as { detectChangeDirProfile: (d: string) => string };
    const guardProfile = guard.detectChangeDirProfile(changeDir);
    assert.equal(guardProfile, ctx.resolvedProfile);
    cleanupTempDirs(ctx);
  });

  registry.then(/^the resolved default profile is "([^"]+)"$/, (args) => {
    assert.equal(ctx.resolvedProfile, args[0]);
  });

  registry.given(/^a user or agent specifies the legacy profile "([^"]+)"$/, (args) => {
    ctx.profile = args[0];
  });

  registry.when('profile validation is executed in schema, CLI, MCP, progressive-friction, or guard-branch.cjs', () => {
    const profile = ctx.profile ?? '';
    const schemaRes = validateArtifactSchema(
      { id: 'SPEC-CHG-067-LEGACY', type: 'delivery-spec', 'change-id': 'CHG-067-LEGACY', profile },
      'delivery-spec',
      repoRoot
    );
    ctx.schemaValid = schemaRes.valid;
    ctx.typesValid = (VALID_CHANGE_PROFILES as readonly string[]).includes(profile);

    const { ws } = createTempSddWorkspace(
      'feat/CHG-067-legacy',
      'chg-067-legacy',
      `---\nprofile: ${profile}\n---\n# Spec\n`,
      true
    );
    ctx.tempDirs.push(ws);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const guard = require(guardScriptPath) as {
      evaluateGuardDecision: (p: { toolCall: { args: { Path: string } }; workspacePaths: string[] }) => {
        decision: 'allow' | 'deny';
        reason?: string;
      };
    };
    const guardOut = guard.evaluateGuardDecision({
      toolCall: { args: { Path: path.join(ws, 'src', 'app.ts') } },
      workspacePaths: [ws],
    });
    ctx.guardDecision = guardOut.decision;
    cleanupTempDirs(ctx);
  });

  registry.then(
    /^the system strictly rejects "([^"]+)" as invalid and requires "patch", "minor", or "major"$/,
    (args) => {
      const legacy = args[0];
      assert.equal(ctx.schemaValid, false, `Schema must reject legacy profile '${legacy}'`);
      assert.equal(ctx.typesValid, false, `VALID_CHANGE_PROFILES must exclude '${legacy}'`);
      assert.equal(ctx.guardDecision, 'deny', `guard-branch.cjs must deny legacy profile '${legacy}'`);
    }
  );

  registry.given('an active SDD increment with profile "patch"', () => {
    ctx.profile = 'patch';
  });

  registry.when('an agent attempts to modify a protected Anti-Bypass path such as "schemas/sdd/spec.schema.json"', () => {
    const { ws, changeDir } = createTempSddWorkspace(
      'feat/CHG-067-patch',
      'chg-067-patch',
      '---\nprofile: patch\n---\n# Patch Spec\n',
      false
    );
    ctx.tempDirs.push(ws);

    const frictionRes = verifyProgressiveFriction({
      rootDir: ws,
      changeDir,
      diffFiles: ['schemas/sdd/spec.schema.json'],
    });
    ctx.frictionSuccess = frictionRes.success;
    ctx.frictionViolations = frictionRes.violations;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const guard = require(guardScriptPath) as {
      evaluateGuardDecision: (p: { toolCall: { args: { Path: string } }; workspacePaths: string[] }) => {
        decision: 'allow' | 'deny';
        reason?: string;
      };
    };
    const guardOut = guard.evaluateGuardDecision({
      toolCall: { args: { Path: path.join(ws, 'schemas', 'sdd', 'spec.schema.json') } },
      workspacePaths: [ws],
    });
    ctx.guardDecision = guardOut.decision;
    ctx.guardReason = guardOut.reason;
    cleanupTempDirs(ctx);
  });

  registry.then('progressive-friction and guard-branch.cjs block the modification and require "minor" or "major"', () => {
    assert.equal(ctx.frictionSuccess, false);
    assert.match(ctx.frictionViolations.join('\n'), /minor|major/i);
    assert.equal(ctx.guardDecision, 'deny');
    assert.match(ctx.guardReason ?? '', /minor|major/i);
  });
}
