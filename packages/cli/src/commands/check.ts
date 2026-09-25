/**
 * CLI Handler: aisdlc check
 * Unified Pre-flight check command with optional non-destructive auto-fix.
 */

import pc from 'picocolors';
import {
  checkGherkinInSync,
  extractGherkinFeatures,
  PreflightCheckOptions,
  PreflightCheckResult,
  PreflightGateSummary,
  syncPdacDigests,
  verifyArtifactsSchemas,
  verifyLicenses,
  verifyPdacGraph,
  verifyQualityGate,
  verifySast,
  verifySecrets,
  verifyTasksGovernance,
  verifyTestingCoverage,
  verifyTraceability,
} from '@ai-sdlc/core';
import { isJsonOutput } from './verify.js';

export interface CheckCommandOptions extends PreflightCheckOptions {
  json?: boolean;
  format?: string;
}


export function runAutoFix(rootDir: string, silent?: boolean): { gherkinCount: number; digestsCount: number } {
  const gherkinRes = extractGherkinFeatures({ rootDir });
  const pdacRes = syncPdacDigests({ rootDir });

  if (!silent) {
    if (gherkinRes.features.length > 0) {
      console.log(`  ${pc.cyan('🔧 [AUTO-FIX]')} Synchronized ${pc.bold(String(gherkinRes.features.length))} .feature files (${gherkinRes.totalScenarios} scenarios).`);
    }
    if (pdacRes.syncedCount > 0) {
      console.log(`  ${pc.cyan('🔧 [AUTO-FIX]')} Synchronized ${pc.bold(String(pdacRes.syncedCount))} SHA-256 digests across ${pdacRes.updatedFiles.length} files.`);
    }
  }

  return { gherkinCount: gherkinRes.features.length, digestsCount: pdacRes.syncedCount };
}

export function auditGherkinGate(rootDir: string, wasAutoFixed: boolean): PreflightGateSummary {
  const syncCheck = checkGherkinInSync({ rootDir });
  if (wasAutoFixed) {
    return {
      name: 'BDD Synchronization (Gherkin -> .feature)',
      status: 'FIXED',
      message: `${syncCheck.totalFeatures} specifications automatically synchronized`,
    };
  }
  if (!syncCheck.inSync) {
    const totalOut = syncCheck.missingFiles.length + syncCheck.outOfSyncFiles.length;
    return {
      name: 'BDD Synchronization (Gherkin -> .feature)',
      status: 'FAILED',
      message: `${totalOut} out-of-sync or missing .feature file(s)`,
      remediation: "Run 'aisdlc check --fix' to extract and regenerate .feature files.",
    };
  }
  return {
    name: 'BDD Synchronization (Gherkin -> .feature)',
    status: 'PASSED',
    message: `${syncCheck.totalFeatures} specifications up to date on disk`,
  };
}

export function auditPdacGate(rootDir: string, wasAutoFixed: boolean): PreflightGateSummary {
  const res = verifyPdacGraph({ rootDir });
  if (res.success) {
    return {
      name: 'PDaC Integrity & SHA-256 Drift',
      status: wasAutoFixed ? 'FIXED' : 'PASSED',
      message: `${res.totalNodes} nodes and ${res.totalEdges} citations cryptographically aligned`,
    };
  }
  return {
    name: 'PDaC Integrity & SHA-256 Drift',
    status: 'FAILED',
    message: `${res.drifts.length} digest drift(s) detected (STALE)`,
    remediation: "Run 'aisdlc check --fix' to automatically synchronize citation digests.",
  };
}

export function auditQualityGate(rootDir: string): PreflightGateSummary {
  const res = verifyQualityGate({ rootDir });
  if (res.success) {
    return {
      name: 'Quality Gate (Complexity & Maintainability)',
      status: 'PASSED',
      message: `${res.passCount}/${res.totalFunctions} compliant functions (CC <= 10, LOC <= 40)`,
    };
  }
  const firstFail = res.results.find((r) => r.status === 'FAIL');
  const detail = firstFail ? ` (e.g. ${firstFail.functionName}: ${firstFail.violations.join(', ')})` : '';
  return {
    name: 'Quality Gate (Complexity & Maintainability)',
    status: 'FAILED',
    message: `${res.failCount} function(s) exceed quality thresholds${detail}`,
    remediation: 'Refactor offending functions by reducing conditional branches and lines of code.',
  };
}

export function auditTraceabilityGate(rootDir: string): PreflightGateSummary {
  const res = verifyTraceability({ rootDir });
  if (res.success) {
    return {
      name: '360° Traceability (Reverse RTM)',
      status: 'PASSED',
      message: `${res.totalRequirements} requirements with 360° coverage (0 orphans)`,
    };
  }
  const orphanIds = res.orphans.map((o) => o.id).slice(0, 3).join(', ');
  return {
    name: '360° Traceability (Reverse RTM)',
    status: 'FAILED',
    message: `${res.orphanCount} orphan requirement(s) (${orphanIds})`,
    remediation: 'Link orphan requirements to their components in arc42 or test suites.',
  };
}

export function auditGovernanceGate(rootDir: string): PreflightGateSummary {
  const res = verifyTasksGovernance({ rootDir });
  if (res.success) {
    return {
      name: 'Tasks Governance & Autonomy Classification',
      status: 'PASSED',
      message: `${res.totalTasks} tasks audited and compliant with autonomy modes`,
    };
  }
  return {
    name: 'Tasks Governance & Autonomy Classification',
    status: 'FAILED',
    message: `${res.violations.length} governance violation(s) detected`,
    remediation: 'Review tasks.md to assign verifiable criteria and valid autonomy modes.',
  };
}

export function auditTestingGate(rootDir: string): PreflightGateSummary {
  const res = verifyTestingCoverage({ rootDir });
  if (res.success) {
    return {
      name: 'Test Coverage in Requirements & Tasks',
      status: 'PASSED',
      message: `${res.passedRequirements}/${res.totalRequirements} reqs and ${res.passedTasks}/${res.totalTasks} tasks verified`,
    };
  }
  return {
    name: 'Test Coverage in Requirements & Tasks',
    status: 'FAILED',
    message: `${res.failedRequirements} req(s) and ${res.failedTasks} task(s) without verifiable tests`,
    remediation: 'Add executable tests (.spec or .feature) for pending requirements and tasks.',
  };
}

export function auditLicensesGate(rootDir: string): PreflightGateSummary {
  const res = verifyLicenses({ rootDir });
  if (res.success) {
    return {
      name: 'Open Source License Governance',
      status: 'PASSED',
      message: `${res.permittedCount} dependencies compliant with license-policy.yaml`,
    };
  }
  const badPkgs = res.violations.map((v) => `${v.packageName} (${v.license})`).slice(0, 2).join(', ');
  return {
    name: 'Open Source License Governance',
    status: 'FAILED',
    message: `${res.violations.length} prohibited license(s) detected: ${badPkgs}`,
    remediation: 'Replace packages with restricted licenses or request approval in license-policy.yaml.',
  };
}

export function auditSchemasGate(rootDir: string): PreflightGateSummary {
  const res = verifyArtifactsSchemas({ rootDir });
  if (res.success) {
    return {
      name: 'JSON Schemas Compliance (Draft 2020-12)',
      status: 'PASSED',
      message: `${res.validCount}/${res.totalEvaluated} artifacts compliant with their schemas`,
    };
  }
  const firstViolation = res.violations[0]?.message || 'Invalid structure';
  return {
    name: 'JSON Schemas Compliance (Draft 2020-12)',
    status: 'FAILED',
    message: `${res.invalidCount} artifact(s) do not comply with JSON schema: ${firstViolation}`,
    remediation: "Run 'aisdlc verify schemas' to audit and fix required fields.",
  };
}

export function auditSecretsGate(rootDir: string): PreflightGateSummary {
  const res = verifySecrets({ rootDir });
  if (res.success) {
    return {
      name: 'Secrets and Credentials Detection (Gitleaks Gate)',
      status: 'PASSED',
      message: `${res.totalFilesScanned} clean files (0 secrets or exposed credentials)`,
    };
  }
  const firstFinding = res.findings[0];
  const findingMsg = firstFinding ? ` (e.g. ${firstFinding.ruleId} in ${firstFinding.relPath}:${firstFinding.lineNumber})` : '';
  return {
    name: 'Secrets and Credentials Detection (Gitleaks Gate)',
    status: 'FAILED',
    message: `${res.findingsCount} exposed credential(s) or key(s)${findingMsg}`,
    remediation: 'Revoke exposed tokens, store them in environment variables, or use // ai-sdlc:allow-secret.',
  };
}

export function auditSecurityGate(rootDir: string): PreflightGateSummary {
  const secRes = verifySecrets({ rootDir });
  const sastRes = verifySast({ rootDir });

  if (secRes.success && sastRes.success) {
    return {
      name: 'Shift-Left Security (Gitleaks Secrets & SAST)',
      status: 'PASSED',
      message: `${secRes.totalFilesScanned} clean files (0 secrets, 0 vulnerabilities)`,
    };
  }

  const errors: string[] = [];
  if (!secRes.success) {
    const f = secRes.findings[0];
    errors.push(`${secRes.findingsCount} secret(s) (e.g. ${f.ruleId} in ${f.relPath}:${f.lineNumber})`);
  }
  if (!sastRes.success) {
    const v = sastRes.violations[0];
    errors.push(`${sastRes.violationsCount} SAST violation(s) (e.g. ${v.ruleId} in ${v.relPath}:${v.lineNumber})`);
  }

  return {
    name: 'Shift-Left Security (Gitleaks Secrets & SAST)',
    status: 'FAILED',
    message: errors.join('; '),
    remediation: "Run 'aisdlc verify security' and resolve credentials or vulnerable patterns.",
  };
}

export function renderDashboard(
  gates: PreflightGateSummary[],
  autoFixExecuted: boolean,
  gherkinCount: number,
  digestsCount: number
): void {
  console.log(pc.bold(pc.cyan('\n==============================================================================')));
  console.log(pc.bold(pc.cyan('             AI-SDLC: CONSOLIDATED PRE-FLIGHT DASHBOARD (aisdlc check)        ')));
  console.log(pc.bold(pc.cyan('==============================================================================\n')));

  if (autoFixExecuted) {
    console.log(pc.bold(`  ${pc.magenta('AUTO-FIX MODE ACTIVE:')} Non-destructive preliminary syncs applied:`));
    console.log(`    - Gherkin scenarios synchronized: ${pc.bold(String(gherkinCount))}`);
    console.log(`    - SHA-256 digests synchronized:    ${pc.bold(String(digestsCount))}\n`);
  }

  for (const gate of gates) {
    const badge =
      gate.status === 'PASSED'
        ? pc.green('✔ PASSED    ')
        : gate.status === 'FIXED'
          ? pc.cyan('🔧 AUTO-FIX ')
          : pc.red('✖ FAILED    ');

    console.log(`  [${badge}] ${pc.bold(gate.name)}`);
    console.log(`               ${pc.dim(gate.message)}`);
  }

  const failedGates = gates.filter((g) => g.status === 'FAILED');
  if (failedGates.length > 0) {
    console.log(pc.bold(pc.red('\n------------------------------------------------------------------------------')));
    console.log(pc.bold(pc.red('  REQUIRED ACTIONS TO RESOLVE BLOCKING ERRORS:')));
    console.log(pc.bold(pc.red('------------------------------------------------------------------------------')));
    failedGates.forEach((g, idx) => {
      console.log(`  ${pc.bold(String(idx + 1))}. ${pc.yellow(g.name)}:`);
      console.log(`     👉 ${pc.bold(g.remediation || 'Review affected files.')}`);
    });
    console.log(pc.bold(pc.red('\n⛔ VERDICT: PRE-FLIGHT BLOCKED (EXIT 1)\n')));
  } else {
    console.log(pc.bold(pc.green('\n==============================================================================')));
    console.log(pc.bold(pc.green('✨ VERDICT: PRE-FLIGHT PASSED (EXIT 0) - Repository ready for Pull Request')));
    console.log(pc.bold(pc.green('==============================================================================\n')));
  }
}

export function executePreflightCheck(options: CheckCommandOptions = {}): PreflightCheckResult {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);
  let gherkinCount = 0;
  let digestsCount = 0;

  if (options.fix) {
    const fixResult = runAutoFix(rootDir, isSilent);
    gherkinCount = fixResult.gherkinCount;
    digestsCount = fixResult.digestsCount;
  }

  const gates: PreflightGateSummary[] = [
    auditGherkinGate(rootDir, options.fix === true && gherkinCount > 0),
    auditPdacGate(rootDir, options.fix === true && digestsCount > 0),
    auditQualityGate(rootDir),
    auditTraceabilityGate(rootDir),
    auditGovernanceGate(rootDir),
    auditTestingGate(rootDir),
    auditLicensesGate(rootDir),
    auditSchemasGate(rootDir),
    auditSecurityGate(rootDir),
  ];

  const success = gates.every((g) => g.status === 'PASSED' || g.status === 'FIXED');

  if (!isSilent) {
    renderDashboard(gates, Boolean(options.fix), gherkinCount, digestsCount);
  }

  const result: PreflightCheckResult = {
    success,
    autoFixExecuted: Boolean(options.fix),
    gherkinSynced: gherkinCount,
    digestsSynced: digestsCount,
    gates,
  };

  if (useJson) {
    const payload = {
      command: 'check',
      success: result.success,
      exitCode: result.success ? 0 : 1,
      autoFixExecuted: result.autoFixExecuted,
      gherkinSynced: result.gherkinSynced,
      digestsSynced: result.digestsSynced,
      gates: result.gates,
    };
    console.log(JSON.stringify(payload, null, 2));
  }

  return result;
}

export function runCheck(options: CheckCommandOptions = {}): boolean {
  const result = executePreflightCheck(options);
  return result.success;
}

