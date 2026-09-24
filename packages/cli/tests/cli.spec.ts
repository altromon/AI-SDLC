import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { runGitPlan, runGitValidate } from '../src/commands/git.js';
import { runInit } from '../src/commands/init.js';
import { runSddDeposit, runSddIntegrate, runSddVerify } from '../src/commands/sdd.js';
import {
  runVerifyAll,
  runVerifyDuplicates,
  runVerifyGovernance,
  runVerifyLicenses,
  runVerifyPdac,
  runVerifyQuality,
  runVerifySast,
  runVerifySchemas,
  runVerifySecrets,
  runVerifySecurity,
  runVerifyTesting,
  runVerifyTraceability,
} from '../src/commands/verify.js';

describe('@ai-sdlc/cli Command Suite', () => {
  it('should validate 4-tier git branch names', () => {
    expect(runGitValidate('main')).toBe(true);
    expect(runGitValidate('release/v1.0.0')).toBe(true);
    expect(runGitValidate('feat/CHG-001-test')).toBe(true);
    expect(runGitValidate('task/CHG-001/tsk-01')).toBe(true);
    expect(runGitValidate('invalid_branch')).toBe(false);
  });

  it('should generate git hierarchy plan', () => {
    expect(runGitPlan({ version: 'v2.0.0', feature: 'FEAT-001', tasks: 'TSK-1' })).toBe(true);
  });

  it('should run init in dry-run mode without throwing', () => {
    expect(runInit('test-scaffold', { dryRun: true })).toBe(true);
  });

  it('should support multi-CI flags in dry-run and validate providers', () => {
    expect(runInit('test-scaffold', { dryRun: true, ci: 'gitlab' })).toBe(true);
    expect(runInit('test-scaffold', { dryRun: true, ci: 'azure' })).toBe(true);
    expect(runInit('test-scaffold', { dryRun: true, ci: 'bitbucket' })).toBe(true);
    expect(runInit('test-scaffold', { dryRun: true, ci: 'github' })).toBe(true);
    expect(runInit('test-scaffold', { dryRun: true, ci: 'invalid-provider' })).toBe(false);
  });

  it('should support architecture granularity options in init', () => {
    const tempInitDir = fs.mkdtempSync(path.join(os.tmpdir(), 'temp-init-arch-'));
    try {
      const minimalTarget = path.join(tempInitDir, 'minimal-proj');
      expect(runInit(minimalTarget, { architecture: 'minimal', silent: true })).toBe(true);
      expect(fs.existsSync(path.join(minimalTarget, 'templates', 'architecture', 'component.template.md'))).toBe(true);
      expect(fs.existsSync(path.join(minimalTarget, 'templates', 'architecture', 'adr.template.md'))).toBe(true);
      expect(fs.existsSync(path.join(minimalTarget, 'templates', 'architecture', 'runtime-view.template.md'))).toBe(false);

      const fullTarget = path.join(tempInitDir, 'full-proj');
      expect(runInit(fullTarget, { architecture: 'full', silent: true })).toBe(true);
      expect(fs.existsSync(path.join(fullTarget, 'templates', 'architecture', 'component.template.md'))).toBe(true);
      expect(fs.existsSync(path.join(fullTarget, 'templates', 'architecture', 'runtime-view.template.md'))).toBe(true);
      expect(fs.existsSync(path.join(fullTarget, 'templates', 'architecture', 'glossary.template.md'))).toBe(true);

      const noneTarget = path.join(tempInitDir, 'none-proj');
      expect(runInit(noneTarget, { architecture: 'none', silent: true })).toBe(true);
      expect(fs.existsSync(path.join(noneTarget, 'templates', 'architecture'))).toBe(true);
      expect(fs.readdirSync(path.join(noneTarget, 'templates', 'architecture'))).toHaveLength(0);

      expect(runInit('invalid-arch-target', { dryRun: true, architecture: 'invalid', silent: true })).toBe(false);
    } finally {
      fs.rmSync(tempInitDir, { recursive: true, force: true });
    }
  });

  it('should deposit expected CI configuration files upon real init execution', () => {
    const tempInitDir = fs.mkdtempSync(path.join(os.tmpdir(), 'temp-init-test-'));
    try {
      // Test GitLab CI scaffolding
      const gitlabTarget = path.join(tempInitDir, 'gitlab-proj');
      expect(runInit(gitlabTarget, { ci: 'gitlab' })).toBe(true);
      expect(fs.existsSync(path.join(gitlabTarget, '.gitlab-ci.yml'))).toBe(true);
      expect(fs.existsSync(path.join(gitlabTarget, 'templates', 'ci', '.gitlab-ci.yml'))).toBe(true);
      expect(fs.existsSync(path.join(gitlabTarget, 'templates', 'ci', 'azure-pipelines.yml'))).toBe(true);
      expect(fs.existsSync(path.join(gitlabTarget, 'templates', 'ci', 'bitbucket-pipelines.yml'))).toBe(true);

      // Test Azure DevOps scaffolding
      const azureTarget = path.join(tempInitDir, 'azure-proj');
      expect(runInit(azureTarget, { ci: 'azure' })).toBe(true);
      expect(fs.existsSync(path.join(azureTarget, 'azure-pipelines.yml'))).toBe(true);

      // Test Bitbucket Pipelines scaffolding
      const bitbucketTarget = path.join(tempInitDir, 'bitbucket-proj');
      expect(runInit(bitbucketTarget, { ci: 'bitbucket' })).toBe(true);
      expect(fs.existsSync(path.join(bitbucketTarget, 'bitbucket-pipelines.yml'))).toBe(true);

      // Test GitHub Actions scaffolding
      const githubTarget = path.join(tempInitDir, 'github-proj');
      expect(runInit(githubTarget, { ci: 'github' })).toBe(true);
      expect(fs.existsSync(path.join(githubTarget, '.github', 'workflows', 'ci.yml'))).toBe(true);
      expect(fs.existsSync(path.join(githubTarget, '.github', 'workflows', 'sdd-integrate-on-merge.yml'))).toBe(true);
    } finally {
      fs.rmSync(tempInitDir, { recursive: true, force: true });
    }
  });

  it('should automatically install git hooks when .git exists upon init', () => {
    const tempInitDir = fs.mkdtempSync(path.join(os.tmpdir(), 'temp-init-hooks-'));
    try {
      const gitDir = path.join(tempInitDir, '.git');
      fs.mkdirSync(gitDir, { recursive: true });

      const res = runInit(tempInitDir);
      expect(res).toBe(true);

      const hookPath = path.join(gitDir, 'hooks', 'prepare-commit-msg');
      expect(fs.existsSync(hookPath)).toBe(true);
      const content = fs.readFileSync(hookPath, 'utf-8');
      expect(content).toContain('AI-SDLC: Automated Commit Trailers Injection Hook');
    } finally {
      fs.rmSync(tempInitDir, { recursive: true, force: true });
    }
  });

  it('should not install git hook in dry-run mode', () => {
    const tempInitDir = fs.mkdtempSync(path.join(os.tmpdir(), 'temp-init-dryrun-'));
    try {
      const gitDir = path.join(tempInitDir, '.git');
      fs.mkdirSync(gitDir, { recursive: true });

      const res = runInit(tempInitDir, { dryRun: true });
      expect(res).toBe(true);

      const hookPath = path.join(gitDir, 'hooks', 'prepare-commit-msg');
      expect(fs.existsSync(hookPath)).toBe(false);
    } finally {
      fs.rmSync(tempInitDir, { recursive: true, force: true });
    }
  });

  it('should succeed when .git does not exist during init', () => {
    const tempInitDir = fs.mkdtempSync(path.join(os.tmpdir(), 'temp-init-nogit-'));
    try {
      const res = runInit(tempInitDir);
      expect(res).toBe(true);
      expect(fs.existsSync(path.join(tempInitDir, 'quality-policy.yaml'))).toBe(true);
      expect(fs.existsSync(path.join(tempInitDir, '.git'))).toBe(false);
    } finally {
      fs.rmSync(tempInitDir, { recursive: true, force: true });
    }
  });

  it('should execute quality gate verification with default options', () => {
    const passed = runVerifyQuality({ silent: true });
    expect(typeof passed).toBe('boolean');
  });

  it('should dynamically configure quality gate thresholds via options', () => {
    // Permissive with relaxed thresholds
    const passedRelaxed = runVerifyQuality({
      silent: true,
      maxCyclomatic: 20,
      minMaintainability: 20,
      enforceMode: 'STRICT',
    });
    expect(passedRelaxed).toBe(true);

    // Strict with impossible threshold CC <= 1 triggers failure on real code
    const failedStrict = runVerifyQuality({
      silent: true,
      maxCyclomatic: 1,
      enforceMode: 'STRICT',
    });
    expect(failedStrict).toBe(false);
  });

  it('should execute traceability verification', () => {
    const passed = runVerifyTraceability({ silent: true });
    expect(typeof passed).toBe('boolean');
  });

  it('should execute tasks governance verification', () => {
    const passed = runVerifyGovernance({ silent: true });
    expect(typeof passed).toBe('boolean');
  });

  it('should execute testing coverage verification', () => {
    const passed = runVerifyTesting({ silent: true });
    expect(typeof passed).toBe('boolean');
  });

  it('should execute license compliance verification', () => {
    const passed = runVerifyLicenses({ silent: true });
    expect(typeof passed).toBe('boolean');
  });

  it('should execute pdac drift verification', () => {
    const passed = runVerifyPdac({ silent: true });
    expect(typeof passed).toBe('boolean');
  });

  it('should execute duplicate requirements verification via CLI', () => {
    const passed = runVerifyDuplicates({ silent: true });
    expect(passed).toBe(true);
  });

  it('should verify SDD workspaces and HOF-* sidecars via CLI', () => {
    const passed = runSddVerify({ silent: true });
    expect(passed).toBe(true);
  });

  it('should deposit SDD HOF-* sidecar via CLI', () => {
    const passed = runSddDeposit({
      change: 'chg-cli-deposit-test',
      framework: 'openspec',
      silent: true,
      requirements: 'FR-TEST-01',
      useCases: 'UC-TEST-01',
    });
    expect(passed).toBe(true);

    // Clean up created test folder
    const createdDir = path.join(process.cwd(), 'specs', 'changes', 'active', 'chg-cli-deposit-test');
    if (fs.existsSync(createdDir)) {
      fs.rmSync(createdDir, { recursive: true, force: true });
    }
  });

  it('should handle SDD integrate command via CLI', () => {
    // Non-existent change returns false gracefully
    const resMissing = runSddIntegrate({
      change: 'chg-non-existent-999',
      silent: true,
    });
    expect(resMissing).toBe(false);

    // Auto flag returns false gracefully when no matching change exists
    const resAuto = runSddIntegrate({
      auto: true,
      headRef: 'feature/no-such-change',
      silent: true,
    });
    expect(resAuto).toBe(false);
  });

  it('should verify artifact schemas via CLI command', () => {
    const passed = runVerifySchemas({ silent: false });
    expect(passed).toBe(true);
  });

  it('should execute secret scanning verification via CLI', () => {
    const passed = runVerifySecrets({ silent: true });
    expect(passed).toBe(true);
  });

  it('should execute sast verification via CLI', () => {
    const passed = runVerifySast({ silent: true });
    expect(passed).toBe(true);
  });

  it('should execute unified security verification (secrets and sast) via CLI', () => {
    const passed = runVerifySecurity({ silent: true });
    expect(passed).toBe(true);
  });

  it('should verify all quality gates including schemas and security via CLI', () => {
    const passed = runVerifyAll({ silent: true });
    expect(passed).toBe(true);
  });
});
