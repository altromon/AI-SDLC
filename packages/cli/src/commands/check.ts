/**
 * CLI Handler: aisdlc check
 * Unified Pre-flight check command with optional non-destructive auto-fix.
 */

import * as fs from 'fs';
import * as path from 'path';
import pc from 'picocolors';
import {
  checkGherkinInSync,
  extractGherkinFeatures,
  GherkinScaffoldLanguage,
  PreflightCheckOptions,
  PreflightCheckResult,
  PreflightGateSummary,
  scaffoldGherkinSteps,
  syncPdacDigests,
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
import { isJsonOutput } from './verify.js';

export interface CheckCommandOptions extends PreflightCheckOptions {
  json?: boolean;
  format?: string;
  vuln?: boolean;
}

const SUPPORTED_SCAFFOLD_LANGUAGES = new Set<GherkinScaffoldLanguage>(['ts', 'py', 'go', 'rs', 'cs']);
const SKIP_MANIFEST_DIRS = new Set([
  'node_modules',
  '.git',
  'bin',
  'obj',
  'dist',
  'build',
  'target',
  '.venv',
  'venv',
  '__pycache__',
  '.pytest_cache',
]);

export function hasDotnetProjectFiles(rootDir: string): boolean {
  if (!fs.existsSync(rootDir)) return false;
  try {
    return fs.readdirSync(rootDir).some((f) => f.endsWith('.csproj') || f.endsWith('.sln') || f.endsWith('.slnx'));
  } catch {
    return false;
  }
}

export function normalizeScaffoldLanguage(raw: unknown): GherkinScaffoldLanguage | null {
  if (typeof raw !== 'string') return null;
  const norm = raw.trim().toLowerCase() as GherkinScaffoldLanguage;
  return SUPPORTED_SCAFFOLD_LANGUAGES.has(norm) ? norm : null;
}

export function readJsonConfigLanguage(rootDir: string): GherkinScaffoldLanguage | null {
  const jsonPath = path.join(rootDir, '.aisdlc.json');
  if (!fs.existsSync(jsonPath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as {
      testing?: { language?: unknown };
      stack?: { language?: unknown };
    };
    return normalizeScaffoldLanguage(parsed?.testing?.language ?? parsed?.stack?.language);
  } catch {
    return null;
  }
}

export function readYamlPolicyLanguage(rootDir: string): GherkinScaffoldLanguage | null {
  const yamlPath = path.join(rootDir, 'quality-policy.yaml');
  if (!fs.existsSync(yamlPath)) return null;
  try {
    const lines = fs.readFileSync(yamlPath, 'utf-8').split(/\r?\n/);
    let section = '';
    for (const line of lines) {
      const top = /^([a-zA-Z0-9_-]+)\s*:/.exec(line);
      if (top) {
        section = top[1];
        continue;
      }
      if (section === 'testing' || section === 'stack') {
        const match = /^\s+language\s*:\s*['"]?([a-zA-Z0-9_-]+)['"]?/.exec(line);
        if (match) return normalizeScaffoldLanguage(match[1]);
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function readConfiguredScaffoldLanguage(rootDir: string): GherkinScaffoldLanguage | null {
  return readJsonConfigLanguage(rootDir) ?? readYamlPolicyLanguage(rootDir);
}

export function enqueueChildDirs(dir: string, nextDepth: number, queue: Array<{ dir: string; depth: number }>): void {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink() || SKIP_MANIFEST_DIRS.has(entry.name)) continue;
      queue.push({ dir: path.join(dir, entry.name), depth: nextDepth });
    }
  } catch {
    // Ignore unreadable directories during bounded scan
  }
}

export function collectManifestDirs(rootDir: string, maxDepth = 3): string[] {
  if (!fs.existsSync(rootDir)) return [];
  const dirs: string[] = [];
  const queue: Array<{ dir: string; depth: number }> = [{ dir: rootDir, depth: 0 }];
  while (queue.length > 0) {
    const current = queue.shift()!;
    dirs.push(current.dir);
    if (current.depth < maxDepth) {
      enqueueChildDirs(current.dir, current.depth + 1, queue);
    }
  }
  return dirs;
}

export function hasAnyFile(dir: string, files: readonly string[]): boolean {
  return files.some((file) => fs.existsSync(path.join(dir, file)));
}

export function detectLanguageInDir(dir: string): GherkinScaffoldLanguage | null {
  if (hasAnyFile(dir, ['pyproject.toml', 'requirements.txt', 'setup.py'])) return 'py';
  if (hasAnyFile(dir, ['go.mod'])) return 'go';
  if (hasAnyFile(dir, ['Cargo.toml'])) return 'rs';
  if (hasDotnetProjectFiles(dir)) return 'cs';
  if (hasAnyFile(dir, ['package.json', 'tsconfig.json'])) return 'ts';
  return null;
}

export function detectDefaultScaffoldLanguage(rootDir: string): GherkinScaffoldLanguage | null {
  const configured = readConfiguredScaffoldLanguage(rootDir);
  if (configured) return configured;
  for (const dir of collectManifestDirs(rootDir, 3)) {
    const detected = detectLanguageInDir(dir);
    if (detected) return detected;
  }
  return null;
}

export function autoScaffoldMissingSteps(rootDir: string): number {
  const sync = checkGherkinInSync({ rootDir });
  const missing = sync.missingStepFiles ?? [];
  if (missing.length === 0) return 0;
  const lang = detectDefaultScaffoldLanguage(rootDir);
  if (!lang) return 0;
  let count = 0;
  for (const fp of missing) {
    if (scaffoldGherkinSteps({ rootDir, featurePath: fp, lang, allowFallback: true }).success) {
      count++;
    }
  }
  return count;
}

export function runAutoFix(rootDir: string, silent?: boolean): { gherkinCount: number; digestsCount: number } {
  const gherkinRes = extractGherkinFeatures({ rootDir });
  const scaffoldedCount = autoScaffoldMissingSteps(rootDir);
  const pdacRes = syncPdacDigests({ rootDir });

  if (!silent) {
    if (gherkinRes.features.length > 0) {
      console.log(`  ${pc.cyan('🔧 [AUTO-FIX]')} Synchronized ${pc.bold(String(gherkinRes.features.length))} .feature files (${gherkinRes.totalScenarios} scenarios).`);
    }
    if (scaffoldedCount > 0) {
      console.log(`  ${pc.cyan('🔧 [AUTO-FIX]')} Scaffolded ${pc.bold(String(scaffoldedCount))} deterministic step files in tests/steps/.`);
    }
    if (pdacRes.syncedCount > 0) {
      console.log(`  ${pc.cyan('🔧 [AUTO-FIX]')} Synchronized ${pc.bold(String(pdacRes.syncedCount))} SHA-256 digests across ${pdacRes.updatedFiles.length} files.`);
    }
  }

  return { gherkinCount: gherkinRes.features.length, digestsCount: pdacRes.syncedCount };
}

export function buildGherkinFailedGate(totalOut: number, hasMissingSteps: boolean): PreflightGateSummary {
  const remediation = hasMissingSteps
    ? "Run 'aisdlc gherkin scaffold <feature-file> --lang <lang> --fallback' to generate step definitions in tests/steps/."
    : "Run 'aisdlc check --fix' to extract and regenerate .feature files, and remove orphan manual .feature files.";
  return {
    name: 'BDD Synchronization (Gherkin -> .feature & steps)',
    status: 'FAILED',
    message: `${totalOut} Gherkin sync/step-scaffold violation(s) detected`,
    remediation,
  };
}

export function auditGherkinGate(rootDir: string, wasAutoFixed: boolean): PreflightGateSummary {
  const syncCheck = checkGherkinInSync({ rootDir });
  const orphans = syncCheck.orphanFeatureFiles ?? [];
  const missingSteps = syncCheck.missingStepFiles ?? [];

  if (!syncCheck.inSync) {
    const totalOut = syncCheck.missingFiles.length + syncCheck.outOfSyncFiles.length + orphans.length + missingSteps.length;
    return buildGherkinFailedGate(totalOut, missingSteps.length > 0);
  }
  return {
    name: 'BDD Synchronization (Gherkin -> .feature & steps)',
    status: wasAutoFixed ? 'FIXED' : 'PASSED',
    message: wasAutoFixed
      ? `${syncCheck.totalFeatures} specifications automatically synchronized`
      : `${syncCheck.totalFeatures} specifications and step scaffolds up to date on disk`,
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

export function formatNonMetricQualityFailure(
  res: ReturnType<typeof verifyQualityGate>
): { message: string; remediation: string } {
  const untested = res.untestedFunctions ?? [];
  if (untested.length > 0) {
    return { message: `${untested.length} function(s) missing unit tests (e.g. ${untested[0].functionName})`, remediation: 'Add unit tests covering all exported and internal functions in test files.' };
  }
  const ui = res.untestedUiComponents ?? [];
  if (ui.length > 0) {
    return { message: `${ui.length} UI component(s) missing driver tests (e.g. ${ui[0].componentName})`, remediation: 'Add UI/E2E or console driver tests referencing each UI component.' };
  }
  const cov = res.coverageViolations ?? [];
  return {
    message: cov.length > 0 ? `${cov.length} coverage threshold violation(s): ${cov[0]}` : `${res.failCount} function(s) exceed quality thresholds`,
    remediation: cov.length > 0 ? 'Increase test coverage to meet quality-policy.yaml thresholds.' : 'Run aisdlc verify quality for details.',
  };
}

export function formatQualityGateFailure(
  res: ReturnType<typeof verifyQualityGate>
): { message: string; remediation: string } {
  const metricFail = res.results.find(
    (r) => r.status === 'FAIL' && r.violations.some((v) => !v.startsWith('Missing unit test'))
  );
  if (metricFail) {
    return {
      message: `${res.failCount} function(s) exceed quality thresholds (e.g. ${metricFail.functionName}: ${metricFail.violations.join(', ')})`,
      remediation: 'Refactor offending functions by reducing conditional branches and lines of code.',
    };
  }
  return formatNonMetricQualityFailure(res);
}

export function auditQualityGate(rootDir: string): PreflightGateSummary {
  const res = verifyQualityGate({ rootDir, requireCoverageReport: false });
  if (res.success) {
    return {
      name: 'Quality Gate (Complexity & Maintainability)',
      status: 'PASSED',
      message: `${res.passCount}/${res.totalFunctions} compliant functions (CC <= 10, LOC <= 40)`,
    };
  }
  const failure = formatQualityGateFailure(res);
  return {
    name: 'Quality Gate (Complexity & Maintainability)',
    status: 'FAILED',
    message: failure.message,
    remediation: failure.remediation,
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

export function formatLicenseFailure(
  res: ReturnType<typeof verifyLicenses>
): { message: string; remediation: string } {
  if (res.violations.length > 0) {
    const badPkgs = res.violations.map((v) => `${v.packageName} (${v.license})`).slice(0, 2).join(', ');
    return { message: `${res.violations.length} prohibited license(s) detected: ${badPkgs}`, remediation: 'Replace packages with restricted licenses or request approval in license-policy.yaml.' };
  }
  const vulns = res.vulnerabilities ?? [];
  if (vulns.length > 0) {
    const bad = vulns.map((v) => `${v.id} (${v.packageName})`).slice(0, 2).join(', ');
    return { message: `${vulns.length} blocking vulnerability(ies) detected: ${bad}`, remediation: 'Upgrade vulnerable dependencies or record VEX statements in license-policy.yaml.' };
  }
  return { message: 'License or vulnerability policy gate failed', remediation: 'Run aisdlc verify licenses for detailed diagnostics.' };
}

export function auditLicensesGate(rootDir: string, vuln?: boolean): PreflightGateSummary {
  const res = verifyLicenses({
    rootDir,
    ...(vuln !== undefined ? { scanVulnerabilities: vuln } : {}),
  });
  if (res.success) {
    return {
      name: 'Open Source License Governance',
      status: 'PASSED',
      message: `${res.permittedCount} dependencies compliant with license-policy.yaml`,
    };
  }
  const failure = formatLicenseFailure(res);
  return {
    name: 'Open Source License Governance',
    status: 'FAILED',
    message: failure.message,
    remediation: failure.remediation,
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

export function formatSecurityErrors(secRes: ReturnType<typeof verifySecrets>, sastRes: ReturnType<typeof verifySast>): string {
  const errors: string[] = [];
  if (!secRes.success) {
    const f = secRes.findings[0];
    errors.push(
      f
        ? `${secRes.findingsCount} secret(s) (e.g. ${f.ruleId} in ${f.relPath}:${f.lineNumber})`
        : `${secRes.findingsCount} secret(s) or expired suppression(s) detected`
    );
  }
  if (!sastRes.success) {
    const v = sastRes.violations[0];
    errors.push(
      v
        ? `${sastRes.violationsCount} SAST violation(s) (e.g. ${v.ruleId} in ${v.relPath}:${v.lineNumber})`
        : `${sastRes.violationsCount} SAST violation(s) or expired/invalid suppression(s) detected`
    );
  }
  return errors.join('; ');
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

  return {
    name: 'Shift-Left Security (Gitleaks Secrets & SAST)',
    status: 'FAILED',
    message: formatSecurityErrors(secRes, sastRes),
    remediation: "Run 'aisdlc verify security' and resolve credentials or vulnerable patterns.",
  };
}

export function auditDuplicatesGate(rootDir: string): PreflightGateSummary {
  const res = verifyArtifactDuplicates({ rootDir });
  if (res.success) {
    return {
      name: 'Duplicate Requirements & Redundancy',
      status: 'PASSED',
      message: `${res.totalRequirements} requirements evaluated (0 collisions, ${res.warningCount} warnings)`,
    };
  }
  const firstErr = res.issues.find((i) => i.severity === 'ERROR')?.message || 'Collision detected';
  return {
    name: 'Duplicate Requirements & Redundancy',
    status: 'FAILED',
    message: `${res.errorCount} duplication error(s): ${firstErr}`,
    remediation: "Run 'aisdlc verify duplicates' and resolve duplicate requirement IDs or statements.",
  };
}

export function auditFrictionGate(rootDir: string): PreflightGateSummary {
  const res = verifyProgressiveFriction({ rootDir });
  if (res.success) {
    return {
      name: 'Progressive Friction & Anti-Bypass Guardrails',
      status: 'PASSED',
      message: `Profile '${res.profile}' compliant (${res.evaluatedFiles.length} evaluated paths)`,
    };
  }
  const firstViolation = res.bypassedRules[0] || res.errors[0] || 'Anti-bypass guardrail triggered';
  return {
    name: 'Progressive Friction & Anti-Bypass Guardrails',
    status: 'FAILED',
    message: firstViolation,
    remediation: "Reclassify change profile to 'minor' or 'major', or revert protected path changes.",
  };
}

export function auditPrivacyGate(rootDir: string): PreflightGateSummary {
  const res = verifyPrivacy({ rootDir });
  if (res.success) {
    return {
      name: 'Data Protection & Privacy-by-Design (GDPR/PII-SAST)',
      status: 'PASSED',
      message: `${res.totalFilesScanned} clean files (${res.dataAssetsCount} data assets, ${res.ropaRecordsCount} ROPA records, 0 violations)`,
    };
  }
  const first = res.violations[0];
  const detail = first ? ` (e.g. ${first.ruleId} in ${first.relPath})` : '';
  return {
    name: 'Data Protection & Privacy-by-Design (GDPR/PII-SAST)',
    status: 'FAILED',
    message: `${res.violationsCount} privacy violation(s) detected${detail}`,
    remediation: "Run 'aisdlc verify privacy' and mask PII or register ROPA / retention policies.",
  };
}

export function renderGateBadge(status: string): string {
  if (status === 'PASSED') return pc.green('✔ PASSED    ');
  if (status === 'FIXED') return pc.cyan('🔧 AUTO-FIX ');
  return pc.red('✖ FAILED    ');
}

export function renderRemediations(failedGates: PreflightGateSummary[]): void {
  console.log(pc.bold(pc.red('\n------------------------------------------------------------------------------')));
  console.log(pc.bold(pc.red('  REQUIRED ACTIONS TO RESOLVE BLOCKING ERRORS:')));
  console.log(pc.bold(pc.red('------------------------------------------------------------------------------')));
  failedGates.forEach((g, idx) => {
    console.log(`  ${pc.bold(String(idx + 1))}. ${pc.yellow(g.name)}:`);
    console.log(`     👉 ${pc.bold(g.remediation || 'Review affected files.')}`);
  });
  console.log(pc.bold(pc.red('\n⛔ VERDICT: PRE-FLIGHT BLOCKED (EXIT 1)\n')));
}

export function printDashboardHeader(autoFixExecuted: boolean, gherkinCount: number, digestsCount: number): void {
  console.log(pc.bold(pc.cyan('\n==============================================================================')));
  console.log(pc.bold(pc.cyan('             AI-SDLC: CONSOLIDATED PRE-FLIGHT DASHBOARD (aisdlc check)        ')));
  console.log(pc.bold(pc.cyan('==============================================================================\n')));

  if (autoFixExecuted) {
    console.log(pc.bold(`  ${pc.magenta('AUTO-FIX MODE ACTIVE:')} Non-destructive preliminary syncs applied:`));
    console.log(`    - Gherkin features synchronized: ${pc.bold(String(gherkinCount))}`);
    console.log(`    - SHA-256 digests synchronized:  ${pc.bold(String(digestsCount))}\n`);
  }
}

export function printDashboardFooter(isPassed: boolean): void {
  if (isPassed) {
    console.log(pc.bold(pc.green('\n==============================================================================')));
    console.log(pc.bold(pc.green('✨ VERDICT: PRE-FLIGHT PASSED (EXIT 0) - Repository ready for Pull Request')));
    console.log(pc.bold(pc.green('==============================================================================\n')));
  }
}

export function renderDashboard(
  gates: PreflightGateSummary[],
  autoFixExecuted: boolean,
  gherkinCount: number,
  digestsCount: number
): void {
  printDashboardHeader(autoFixExecuted, gherkinCount, digestsCount);

  for (const gate of gates) {
    console.log(`  [${renderGateBadge(gate.status)}] ${pc.bold(gate.name)}`);
    console.log(`               ${pc.dim(gate.message)}`);
  }

  const failedGates = gates.filter((g) => g.status === 'FAILED');
  if (failedGates.length > 0) {
    renderRemediations(failedGates);
  } else {
    printDashboardFooter(true);
  }
}

export function collectPreflightGates(
  rootDir: string,
  fix: boolean,
  gherkinCount: number,
  digestsCount: number,
  vuln?: boolean
): PreflightGateSummary[] {
  return [
    auditGherkinGate(rootDir, fix && gherkinCount > 0),
    auditPdacGate(rootDir, fix && digestsCount > 0),
    auditQualityGate(rootDir),
    auditTraceabilityGate(rootDir),
    auditGovernanceGate(rootDir),
    auditTestingGate(rootDir),
    auditLicensesGate(rootDir, vuln),
    auditSchemasGate(rootDir),
    auditDuplicatesGate(rootDir),
    auditFrictionGate(rootDir),
    auditSecurityGate(rootDir),
    auditPrivacyGate(rootDir),
  ];
}

export function emitCheckJson(result: PreflightCheckResult): void {
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

export function applyAutoFix(rootDir: string, isSilent: boolean, fix?: boolean): { gherkinCount: number; digestsCount: number } {
  if (!fix) return { gherkinCount: 0, digestsCount: 0 };
  const res = runAutoFix(rootDir, isSilent);
  return { gherkinCount: res.gherkinCount, digestsCount: res.digestsCount };
}

export function executePreflightCheck(options: CheckCommandOptions = {}): PreflightCheckResult {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);
  const { gherkinCount, digestsCount } = applyAutoFix(rootDir, isSilent, options.fix);

  const gates = collectPreflightGates(rootDir, Boolean(options.fix), gherkinCount, digestsCount, options.vuln);
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
    emitCheckJson(result);
  }

  return result;
}

export function runCheck(options: CheckCommandOptions = {}): boolean {
  const result = executePreflightCheck(options);
  return result.success;
}

