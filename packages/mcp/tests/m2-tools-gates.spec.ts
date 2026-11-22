/**
 * Unit Tests for MCP Composite Quality Gate Runners
 * Cites: FR-028-NATIVE-MCP-SERVER-001, FR-047-MCP-SERVER-HARDENING-DLP-001
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const coreMocks = vi.hoisted(() => ({
  verifyQualityGate: vi.fn(),
  verifySecrets: vi.fn(),
  verifySast: vi.fn(),
  verifyLicenses: vi.fn(),
  verifyTraceability: vi.fn(),
  verifyTasksGovernance: vi.fn(),
  verifyTestingCoverage: vi.fn(),
  checkGherkinInSync: vi.fn(),
  verifyPdacGraph: vi.fn(),
  verifyArtifactsSchemas: vi.fn(),
  verifyArtifactDuplicates: vi.fn(),
  verifyProgressiveFriction: vi.fn(),
  verifyPrivacy: vi.fn(),
}));

vi.mock('@aisdlc/core', () => coreMocks);

import {
  resolveCompositeExitCode,
  runCoreGates,
  runExtendedGates,
  runFullGates,
  runLiteGates,
  runVerifyAllGates,
} from '../src/tools/index.js';

function seedPassingCoreVerifiers() {
  coreMocks.verifyQualityGate.mockReturnValue({ success: true, passCount: 10, totalFunctions: 10 });
  coreMocks.verifySecrets.mockReturnValue({ success: true, findingsCount: 0 });
  coreMocks.verifySast.mockReturnValue({ success: true, violationsCount: 0 });
  coreMocks.verifyLicenses.mockReturnValue({ success: true, totalEvaluated: 5 });
  coreMocks.verifyTraceability.mockReturnValue({ success: true, orphanCount: 0 });
  coreMocks.verifyTasksGovernance.mockReturnValue({ success: true, totalTasks: 4 });
  coreMocks.verifyTestingCoverage.mockReturnValue({ success: true, passedRequirements: 3, totalRequirements: 3 });
  coreMocks.checkGherkinInSync.mockReturnValue({ inSync: true, totalFeatures: 2 });
  coreMocks.verifyPdacGraph.mockReturnValue({ success: true, totalNodes: 6 });
  coreMocks.verifyArtifactsSchemas.mockReturnValue({ success: true, validCount: 8, totalEvaluated: 8 });
  coreMocks.verifyArtifactDuplicates.mockReturnValue({ success: true, errorCount: 0, warningCount: 0 });
  coreMocks.verifyProgressiveFriction.mockReturnValue({ success: true, profile: 'standard', bypassedRules: [] });
  coreMocks.verifyPrivacy.mockReturnValue({ success: true, dataAssetsCount: 1, ropaRecordsCount: 1, violationsCount: 0 });
}

describe('MCP Composite Gate Runners', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedPassingCoreVerifiers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runCoreGates runs 5 core gates, forwards requireCoverageReport, and combines secrets+SAST', () => {
    const gates = runCoreGates('/proj', true);
    expect(coreMocks.verifyQualityGate).toHaveBeenCalledWith({ rootDir: '/proj', requireCoverageReport: true });
    expect(gates.map((g) => g.name)).toEqual(['quality', 'traceability', 'governance', 'licenses', 'security']);
    expect(gates.every((g) => g.success)).toBe(true);

    coreMocks.verifySast.mockReturnValueOnce({ success: false, violationsCount: 2 });
    const sastFail = runCoreGates('/proj', false);
    expect(sastFail.find((g) => g.name === 'security')?.success).toBe(false);
    expect(sastFail.find((g) => g.name === 'security')?.summary).toBe('0 secrets, 2 SAST');
  });

  it('runExtendedGates runs 7 extended gates and propagates failures cleanly', () => {
    coreMocks.checkGherkinInSync.mockReturnValueOnce({ inSync: false, totalFeatures: 1 });
    coreMocks.verifyPrivacy.mockReturnValueOnce({
      success: false,
      dataAssetsCount: 2,
      ropaRecordsCount: 0,
      violationsCount: 3,
    });
    const gates = runExtendedGates('/proj');
    expect(gates.map((g) => g.name)).toEqual([
      'testing',
      'gherkin',
      'pdac',
      'schemas',
      'duplicates',
      'friction',
      'privacy',
    ]);
    expect(gates.find((g) => g.name === 'gherkin')?.success).toBe(false);
    expect(gates.find((g) => g.name === 'privacy')?.success).toBe(false);
  });

  it('runFullGates returns 12 gates and runLiteGates returns 3 essential gates', () => {
    const full = runFullGates('/proj', false);
    expect(full).toHaveLength(12);

    coreMocks.verifySecrets.mockReturnValueOnce({ success: false, findingsCount: 1 });
    const lite = runLiteGates('/proj', true);
    expect(lite.map((g) => g.name)).toEqual(['quality', 'licenses', 'security']);
    expect(lite.find((g) => g.name === 'security')?.success).toBe(false);
    expect(coreMocks.verifyQualityGate).toHaveBeenCalledWith({ rootDir: '/proj', requireCoverageReport: true });
  });

  it('resolveCompositeExitCode enforces 0 -> 4 (security) -> 5 (privacy) -> 1 precedence', () => {
    expect(resolveCompositeExitCode(true, [{ name: 'security', success: false }])).toBe(0);
    expect(
      resolveCompositeExitCode(false, [
        { name: 'security', success: false },
        { name: 'privacy', success: false },
      ])
    ).toBe(4);
    expect(
      resolveCompositeExitCode(false, [
        { name: 'security', success: true },
        { name: 'privacy', success: false },
      ])
    ).toBe(5);
    expect(resolveCompositeExitCode(false, [{ name: 'quality', success: false }])).toBe(1);
    expect(resolveCompositeExitCode(false, [])).toBe(1);
  });

  it('runVerifyAllGates computes full/lite summaries and propagates thrown verifier errors', () => {
    const fullPass = runVerifyAllGates('/proj', false, false);
    expect(fullPass).toMatchObject({
      success: true,
      profile: 'full',
      exitCode: 0,
      totalGates: 12,
      passedGates: 12,
      failedGates: 0,
    });

    coreMocks.verifyPrivacy.mockReturnValueOnce({
      success: false,
      dataAssetsCount: 1,
      ropaRecordsCount: 0,
      violationsCount: 1,
    });
    const privFail = runVerifyAllGates('/proj', false);
    expect(privFail).toMatchObject({
      success: false,
      profile: 'full',
      exitCode: 5,
      passedGates: 11,
      failedGates: 1,
    });

    const litePass = runVerifyAllGates('/proj', true, true);
    expect(litePass).toMatchObject({
      success: true,
      profile: 'lite',
      exitCode: 0,
      totalGates: 3,
    });

    coreMocks.verifyQualityGate.mockImplementationOnce(() => {
      throw new Error('corrupt policy');
    });
    expect(() => runVerifyAllGates('/proj', true)).toThrow('corrupt policy');
  });
});
