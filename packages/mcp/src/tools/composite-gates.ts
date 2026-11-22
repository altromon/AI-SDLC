/**
 * AI-SDLC Native MCP Server Tools — Composite Quality Gate Runners
 * Cites: FR-028-NATIVE-MCP-SERVER-001
 */

import {
  checkGherkinInSync,
  verifyArtifactDuplicates,
  verifyArtifactsSchemas,
  verifyLicenses,
  verifyPdacGraph,
  verifyPrivacy,
  verifyProgressiveFriction,
  verifyQualityGate,
  verifySast,
  verifySecrets,
  verifyTasksGovernance,
  verifyTestingCoverage,
  verifyTraceability,
} from '@aisdlc/core';

export interface GateSummaryItem {
  name: string;
  success: boolean;
  summary: string;
}

export interface VerifyAllGatesResult {
  success: boolean;
  profile: string;
  exitCode: number;
  totalGates: number;
  passedGates: number;
  failedGates: number;
  gates: GateSummaryItem[];
}

export function runCoreGates(root: string, requireCoverageReport?: boolean): GateSummaryItem[] {
  const qg = verifyQualityGate({ rootDir: root, requireCoverageReport });
  const sec = verifySecrets({ rootDir: root });
  const sast = verifySast({ rootDir: root });
  const lc = verifyLicenses({ rootDir: root });
  const tr = verifyTraceability({ rootDir: root });
  const gv = verifyTasksGovernance({ rootDir: root });

  return [
    { name: 'quality', success: qg.success, summary: `${qg.passCount}/${qg.totalFunctions} compliant functions` },
    { name: 'traceability', success: tr.success, summary: `${tr.orphanCount} orphan requirements` },
    { name: 'governance', success: gv.success, summary: `${gv.totalTasks} audited tasks` },
    { name: 'licenses', success: lc.success, summary: `${lc.totalEvaluated} analyzed dependencies` },
    { name: 'security', success: sec.success && sast.success, summary: `${sec.findingsCount} secrets, ${sast.violationsCount} SAST` },
  ];
}

export function runExtendedGates(root: string): GateSummaryItem[] {
  const tc = verifyTestingCoverage({ rootDir: root });
  const gh = checkGherkinInSync({ rootDir: root });
  const pd = verifyPdacGraph({ rootDir: root });
  const sc = verifyArtifactsSchemas({ rootDir: root });
  const dp = verifyArtifactDuplicates({ rootDir: root });
  const fr = verifyProgressiveFriction({ rootDir: root });
  const pv = verifyPrivacy({ rootDir: root });

  return [
    { name: 'testing', success: tc.success, summary: `${tc.passedRequirements}/${tc.totalRequirements} covered requirements` },
    { name: 'gherkin', success: gh.inSync, summary: `${gh.totalFeatures} synchronized features` },
    { name: 'pdac', success: pd.success, summary: `${pd.totalNodes} aligned nodes` },
    { name: 'schemas', success: sc.success, summary: `${sc.validCount}/${sc.totalEvaluated} valid artifacts` },
    { name: 'duplicates', success: dp.success, summary: `${dp.errorCount} errors, ${dp.warningCount} warnings` },
    { name: 'friction', success: fr.success, summary: `profile: ${fr.profile}, ${fr.bypassedRules.length} violations` },
    { name: 'privacy', success: pv.success, summary: `${pv.dataAssetsCount} assets, ${pv.ropaRecordsCount} ROPA, ${pv.violationsCount} violations` },
  ];
}

export function runFullGates(root: string, requireCoverageReport?: boolean): GateSummaryItem[] {
  return [...runCoreGates(root, requireCoverageReport), ...runExtendedGates(root)];
}

export function runLiteGates(root: string, requireCoverageReport?: boolean): GateSummaryItem[] {
  const qg = verifyQualityGate({ rootDir: root, requireCoverageReport });
  const sec = verifySecrets({ rootDir: root });
  const sast = verifySast({ rootDir: root });
  const lc = verifyLicenses({ rootDir: root });

  return [
    { name: 'quality', success: qg.success, summary: `${qg.passCount}/${qg.totalFunctions} compliant functions` },
    { name: 'licenses', success: lc.success, summary: `${lc.totalEvaluated} analyzed dependencies` },
    { name: 'security', success: sec.success && sast.success, summary: `${sec.findingsCount} secrets, ${sast.violationsCount} SAST` },
  ];
}

export function resolveCompositeExitCode(allPassed: boolean, gates: Array<{ name: string; success: boolean }>): number {
  if (allPassed) return 0;
  const secGate = gates.find((g) => g.name === 'security');
  if (secGate && !secGate.success) return 4;
  const privGate = gates.find((g) => g.name === 'privacy');
  if (privGate && !privGate.success) return 5;
  return 1;
}

export function runVerifyAllGates(root: string, isLite: boolean, requireCoverageReport?: boolean): VerifyAllGatesResult {
  const gates = isLite ? runLiteGates(root, requireCoverageReport) : runFullGates(root, requireCoverageReport);
  const allPassed = gates.every((g) => g.success);

  return {
    success: allPassed,
    profile: isLite ? 'lite' : 'full',
    exitCode: resolveCompositeExitCode(allPassed, gates),
    totalGates: gates.length,
    passedGates: gates.filter((g) => g.success).length,
    failedGates: gates.filter((g) => !g.success).length,
    gates,
  };
}
