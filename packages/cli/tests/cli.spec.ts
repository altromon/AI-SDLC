import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { runGitPlan, runGitValidate } from '../src/commands/git.js';
import { runInit } from '../src/commands/init.js';
import { runSddDeposit, runSddIntegrate, runSddVerify } from '../src/commands/sdd.js';
import {
  runVerifyGovernance,
  runVerifyLicenses,
  runVerifyPdac,
  runVerifyQuality,
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
  });
});
