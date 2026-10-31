/**
 * CLI Handler: aisdlc verify
 */

import pc from 'picocolors';
import * as path from 'path';
import {
  writeReportFileIfChanged,
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
  generateSuppressionsAuditReport,
  generateSecuritySarifReport,
  serializeSarifDocument,
  writeSecuritySarifReport,
  type SecuritySuppression,
  type SastSeverity,
} from '@aisdlc/core';

export interface VerifyBaseOptions {
  root?: string;
  silent?: boolean;
  json?: boolean;
  format?: string;
  output?: string;
}

export function isJsonOutput(options: VerifyBaseOptions = {}): boolean {
  if (options.json !== undefined) {
    return Boolean(options.json);
  }
  if (options.format !== undefined) {
    return options.format.trim().toLowerCase() === 'json';
  }
  const env = process.env.AISDLC_FORMAT?.trim().toLowerCase() ||
              process.env.AISDLC_OUTPUT?.trim().toLowerCase();
  return env === 'json';
}

export function isSarifOutput(options: VerifyBaseOptions = {}): boolean {
  if (options.format !== undefined) {
    return options.format.trim().toLowerCase() === "sarif";
  }
  const env = process.env.AISDLC_FORMAT?.trim().toLowerCase() ||
              process.env.AISDLC_OUTPUT?.trim().toLowerCase();
  return env === "sarif";
}

export interface VerifyJsonPayload<TSummary = Record<string, unknown>, TViolation = unknown> {
  gate: string;
  success: boolean;
  exitCode: number;
  summary: TSummary;
  violations: TViolation[];
  [key: string]: unknown;
}

export interface QualityVerifyOptions extends VerifyBaseOptions {
  policy?: string;
  maxCyclomatic?: number | string;
  maxCognitive?: number | string;
  minMaintainability?: number | string;
  maxLines?: number | string;
  enforceMode?: 'STRICT' | 'PERMISSIVE' | string;
  updateBaseline?: boolean;
  baseline?: string | boolean;
  ratchet?: boolean;
}

function buildFunctionMetricViolations(results: ReturnType<typeof verifyQualityGate>['results']) {
  return results
    .filter((r) => r.status === 'FAIL')
    .flatMap((r) =>
      r.violations.map((v) => ({
        file: r.relPath,
        function: r.functionName,
        metric: 'quality',
        message: v,
        metrics: { loc: r.loc, cyclomatic: r.cyclomatic, cognitive: r.cognitive, maintainability: r.maintainability },
      }))
    );
}

function buildQualityViolations(result: ReturnType<typeof verifyQualityGate>) {
  const fnViolations = buildFunctionMetricViolations(result.results);
  const untested = (result.untestedFunctions || []).map((u) => ({
    file: u.file,
    function: u.functionName,
    metric: 'unit-test',
    message: `Function [${u.functionName}] lacks direct unit test`,
  }));
  const cov = (result.coverageViolations || []).map((message) => ({ metric: 'coverage', message }));
  return [...fnViolations, ...untested, ...cov];
}

function emitQualityJson(result: ReturnType<typeof verifyQualityGate>): void {
  const violations = buildQualityViolations(result);
  const payload: VerifyJsonPayload = {
    gate: 'quality',
    success: result.success,
    exitCode: result.success ? 0 : 1,
    summary: {
      totalFiles: result.totalFiles,
      totalFunctions: result.totalFunctions,
      passCount: result.passCount,
      failCount: result.failCount,
      untestedFunctionsCount: result.untestedFunctions?.length || 0,
      coverageViolationsCount: result.coverageViolations?.length || 0,
      baselineViolationsCount: result.baselineViolationsCount || 0,
      toleratedViolationsCount: result.toleratedViolationsCount || 0,
      newViolationsCount: result.newViolationsCount || 0,
      baselineUpdated: result.baselineUpdated || false,
    },
    violations,
  };
  console.log(JSON.stringify(payload, null, 2));
}

function printQualityFailingDetails(failing: ReturnType<typeof verifyQualityGate>['results'], isPermissive: boolean): void {
  const colorFn = isPermissive ? pc.yellow : pc.red;
  const label = isPermissive ? '\n  Detected warnings (PERMISSIVE mode):' : '\n  Detected violations:';
  console.log(colorFn(label));
  const maxToShow = 15;
  for (const f of failing.slice(0, maxToShow)) {
    console.log(`    ${colorFn(isPermissive ? '⚠' : '✖')} ${pc.bold(f.relPath)} [${f.functionName}]: ${f.violations.join(', ')}`);
  }
  if (failing.length > maxToShow) {
    console.log(colorFn(`    ... and ${failing.length - maxToShow} more functions exceeding thresholds.`));
  }
}

function printQualityTestAndCoverageGaps(result: ReturnType<typeof verifyQualityGate>): void {
  const untested = result.untestedFunctions || [];
  if (untested.length > 0) {
    console.log(pc.red('\n  Functions lacking unit tests:'));
    for (const u of untested.slice(0, 15)) {
      console.log(`    ${pc.red('✖')} ${pc.bold(u.file)} [${u.functionName}]`);
    }
  }
  for (const cv of result.coverageViolations || []) {
    console.log(`    ${pc.red('✖')} ${cv}`);
  }
}

function printQualitySummary(result: ReturnType<typeof verifyQualityGate>, isPermissive: boolean): void {
  console.log(`  Analyzed files:         ${pc.bold(String(result.totalFiles))}`);
  console.log(`  Evaluated functions:    ${pc.bold(String(result.totalFunctions))}`);
  console.log(`  Compliant functions:    ${pc.green(String(result.passCount))}`);
  if (result.toleratedViolationsCount && result.toleratedViolationsCount > 0) {
    console.log(`  Tolerated warnings:     ${pc.yellow(String(result.toleratedViolationsCount))} (Ratchet mode)`);
  }
  const failStr = result.failCount > 0 ? (isPermissive ? pc.yellow(String(result.failCount)) : pc.red(String(result.failCount))) : pc.green("0");
  console.log(`  Failing functions:      ${failStr}`);
}

function printQualityConsole(result: ReturnType<typeof verifyQualityGate>): void {
  const isPermissive = result.policy.enforce_mode === "PERMISSIVE";
  console.log(
    `  Active thresholds:      CC <= ${result.policy.max_cyclomatic} | Cognitive <= ${result.policy.max_cognitive} | MI >= ${result.policy.min_maintainability} | Lines <= ${result.policy.max_function_lines} | Mode: ${result.policy.enforce_mode}`
  );
  printQualitySummary(result, isPermissive);
  if (result.failCount > 0) {
    printQualityFailingDetails(result.results.filter((r) => r.status === "FAIL"), isPermissive);
  }
  printQualityTestAndCoverageGaps(result);
  const tag = isPermissive && result.failCount > 0 ? " (PERMISSIVE mode)" : "";
  console.log(result.success ? pc.green(`\n✔ Release Gate PASSED${tag}\n`) : pc.red("\n✖ Release Gate BLOCKED\n"));
}

function buildQualityThresholds(options: QualityVerifyOptions) {
  return {
    max_cyclomatic: options.maxCyclomatic !== undefined ? Number(options.maxCyclomatic) : undefined,
    max_cognitive: options.maxCognitive !== undefined ? Number(options.maxCognitive) : undefined,
    min_maintainability: options.minMaintainability !== undefined ? Number(options.minMaintainability) : undefined,
    max_function_lines: options.maxLines !== undefined ? Number(options.maxLines) : undefined,
    enforce_mode: options.enforceMode,
  };
}

export function runVerifyQuality(options: QualityVerifyOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
  if (!options.silent && !useJson) {
    console.log(pc.bold(pc.cyan('\n🔍 [AI-SDLC] Verifying Quality Gate (Complexity & Maintainability)...')));
  }

  const result = verifyQualityGate({
    rootDir,
    policyPath: options.policy,
    thresholds: buildQualityThresholds(options),
    updateBaseline: options.updateBaseline,
    baseline: options.baseline,
    ratchet: options.ratchet,
  });

  if (useJson) {
    emitQualityJson(result);
  } else if (!options.silent) {
    printQualityConsole(result);
  }
  return result.success;
}

export interface TraceabilityVerifyOptions extends VerifyBaseOptions {}

function buildTraceabilityViolations(result: ReturnType<typeof verifyTraceability>) {
  const orphanViolations = result.orphans.map((o) => ({
    id: o.id,
    title: o.title,
    productStatus: o.productStatus,
    archStatus: o.archStatus,
    testStatus: o.testStatus,
    message: `Orphan requirement [${o.id}]`,
  }));
  const contractViolations = (result.contractAudits || [])
    .filter((c) => c.status !== 'COMPLIANT')
    .map((c) => ({
      id: c.designId,
      method: c.method,
      status: c.status,
      message: `Design contract [${c.designId}] method '${c.method}': ${c.status}`,
    }));
  return [...orphanViolations, ...contractViolations];
}

function emitTraceabilityJson(result: ReturnType<typeof verifyTraceability>): void {
  const payload: VerifyJsonPayload = {
    gate: 'traceability',
    success: result.success,
    exitCode: result.success ? 0 : 1,
    summary: {
      totalRequirements: result.totalRequirements,
      conformingCount: result.totalRequirements - result.orphanCount,
      orphanCount: result.orphanCount,
      missingContractsCount: result.missingContractsCount || 0,
    },
    violations: buildTraceabilityViolations(result),
  };
  console.log(JSON.stringify(payload, null, 2));
}

function printMissingContractAudits(result: ReturnType<typeof verifyTraceability>): void {
  const failingContracts = (result.contractAudits || []).filter((c) => c.status !== 'COMPLIANT');
  if (failingContracts.length === 0) return;
  console.log(pc.red('\n  Unfulfilled design contracts (design.md -> src/ & tests/):'));
  for (const c of failingContracts) {
    console.log(`    ${pc.red('✖')} [${c.designId}] ${c.interfaceName ? `${c.interfaceName}.` : ''}${c.method}: ${c.status}`);
  }
}

function printTraceabilityConsole(result: ReturnType<typeof verifyTraceability>): void {
  console.log(`  Total requirements:     ${pc.bold(String(result.totalRequirements))}`);
  console.log(`  Compliant requirements: ${pc.green(String(result.totalRequirements - result.orphanCount))}`);
  console.log(`  Orphan requirements:    ${result.orphanCount > 0 ? pc.red(String(result.orphanCount)) : pc.green('0')}`);

  if (result.orphanCount > 0) {
    console.log(pc.red('\n  Traceability gaps:'));
    for (const o of result.orphans) {
      console.log(`    ${pc.red('✖')} [${o.id}] Product: ${o.productStatus}, Architecture: ${o.archStatus}, Testing: ${o.testStatus}`);
    }
  }
  printMissingContractAudits(result);
  console.log(result.success ? pc.green('\n✔ 360° Traceability COMPLIANT (100%)\n') : pc.red('\n✖ Traceability BLOCKED\n'));
}

export function runVerifyTraceability(options: TraceabilityVerifyOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);
  if (!isSilent) {
    console.log(pc.bold(pc.cyan('\n🔍 [AI-SDLC] Verifying 360° Traceability (Product -> Architecture -> Testing)...')));
  }

  const result = verifyTraceability({ rootDir });

  if (useJson) {
    emitTraceabilityJson(result);
    return result.success;
  }
  if (!options.silent) {
    printTraceabilityConsole(result);
  }
  return result.success;
}

function emitGovernanceJson(result: ReturnType<typeof verifyTasksGovernance>): void {
  const payload: VerifyJsonPayload = {
    gate: 'governance',
    success: result.success,
    exitCode: result.success ? 0 : 1,
    summary: {
      totalTasks: result.totalTasks,
      verifiedCount: result.verifiedCount,
      unverifiedCount: result.unverifiedCount,
      modeCounts: result.modeCounts,
      riskCounts: result.riskCounts,
    },
    violations: result.violations.map((v) => ({ message: v })),
  };
  console.log(JSON.stringify(payload, null, 2));
}

function printGovernanceConsole(result: ReturnType<typeof verifyTasksGovernance>): void {
  console.log(`  Total audited tasks:    ${pc.bold(String(result.totalTasks))}`);
  console.log(`  Tasks with verification: ${pc.green(String(result.verifiedCount))}`);
  console.log(`  Tasks without verif.:   ${result.unverifiedCount > 0 ? pc.red(String(result.unverifiedCount)) : pc.green('0')}`);
  console.log(`  Autonomy distribution:`);
  console.log(`    🟢 AUTONOMOUS:         ${result.modeCounts['AUTONOMOUS'] || 0}`);
  console.log(`    🟡 HUMAN_REVIEW_PLAN:   ${result.modeCounts['HUMAN_REVIEW_PLAN'] || 0}`);
  console.log(`    🟠 AMBIGUOUS:           ${result.modeCounts['AMBIGUOUS'] || 0}`);
  console.log(`    🔴 HIGH_RISK_MANUAL:    ${result.modeCounts['HIGH_RISK_MANUAL'] || 0}`);

  if (result.violations.length > 0) {
    console.log(pc.red('\n  Governance violations:'));
    for (const v of result.violations) {
      console.log(`    ${pc.red('✖')} ${v}`);
    }
  }
  console.log(result.success ? pc.green('\n✔ Tasks Governance COMPLIANT\n') : pc.red('\n✖ Tasks Governance BLOCKED\n'));
}

export interface GovernanceVerifyOptions extends VerifyBaseOptions {}

export function runVerifyGovernance(options: GovernanceVerifyOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);
  if (!isSilent) {
    console.log(pc.bold(pc.cyan('\n🔍 [AI-SDLC] Verifying Tasks Governance and Autonomy Classification...')));
  }

  const result = verifyTasksGovernance({ rootDir });

  if (useJson) {
    emitGovernanceJson(result);
    return result.success;
  }
  if (!options.silent) {
    printGovernanceConsole(result);
  }
  return result.success;
}

export interface TestingVerifyOptions extends VerifyBaseOptions {}

function formatReqTestingViolationMsg(r: ReturnType<typeof verifyTestingCoverage>['requirements'][number]): string {
  if (r.missingVariants && r.missingVariants.length > 0) {
    return `Requirement [${r.id}] missing BDD variant categories: ${r.missingVariants.join(', ')}`;
  }
  return `Requirement without verifiable test [${r.id}]`;
}

function mapReqViolations(requirements: ReturnType<typeof verifyTestingCoverage>['requirements']) {
  return requirements
    .filter((r) => r.status !== 'VERIFICADO_CON_PRUEBA')
    .map((r) => ({
      type: 'REQUIREMENT',
      id: r.id,
      title: r.title,
      file: r.file,
      missingVariants: r.missingVariants,
      message: formatReqTestingViolationMsg(r),
    }));
}

function mapTaskViolations(tasks: ReturnType<typeof verifyTestingCoverage>['tasks']) {
  return tasks
    .filter((t) => t.status !== 'VERIFICADO_CON_PRUEBA')
    .map((t) => ({
      type: 'TASK',
      id: t.id,
      title: t.title,
      file: t.file,
      message: `Task without test verification [${t.id}]`,
    }));
}

function buildTestingViolations(result: ReturnType<typeof verifyTestingCoverage>) {
  const flowViolations = (result.useCaseFlows || [])
    .filter((u) => u.status !== 'VERIFICADO_CON_PRUEBA')
    .map((u) => ({
      type: 'USE_CASE_FLOW',
      id: u.id,
      file: u.file,
      missingFlows: u.missingFlows,
      message: `Use Case [${u.id}] missing tests for flows: ${u.missingFlows.join(', ')}`,
    }));

  return [...mapReqViolations(result.requirements), ...mapTaskViolations(result.tasks), ...flowViolations];
}

function emitTestingJson(result: ReturnType<typeof verifyTestingCoverage>): void {
  const payload: VerifyJsonPayload = {
    gate: 'testing',
    success: result.success,
    exitCode: result.success ? 0 : 1,
    summary: {
      totalRequirements: result.totalRequirements,
      passedRequirements: result.passedRequirements,
      failedRequirements: result.failedRequirements,
      totalTasks: result.totalTasks,
      passedTasks: result.passedTasks,
      failedTasks: result.failedTasks,
      failedUseCaseFlows: result.failedUseCaseFlows || 0,
    },
    violations: buildTestingViolations(result),
  };
  console.log(JSON.stringify(payload, null, 2));
}

function printTestingFailures(result: ReturnType<typeof verifyTestingCoverage>): void {
  for (const r of result.requirements.filter((req) => req.status !== 'VERIFICADO_CON_PRUEBA')) {
    const varHint = r.missingVariants?.length ? ` [Missing BDD variants: ${r.missingVariants.join(', ')}]` : '';
    console.log(`    ${pc.red('✖')} [Requirement: ${r.id}] ${r.title} (${r.file})${varHint}`);
  }
  for (const t of result.tasks.filter((tsk) => tsk.status !== 'VERIFICADO_CON_PRUEBA')) {
    console.log(`    ${pc.red('✖')} [Task: ${t.id}] ${t.title} (${t.file})`);
  }
  for (const u of (result.useCaseFlows || []).filter((uc) => uc.status !== 'VERIFICADO_CON_PRUEBA')) {
    console.log(`    ${pc.red('✖')} [Use Case Flows: ${u.id}] Missing tests for: ${u.missingFlows.join(', ')} (${u.file})`);
  }
}

function printTestingConsole(result: ReturnType<typeof verifyTestingCoverage>): void {
  console.log(`  Verified requirements:  ${pc.green(`${result.passedRequirements}/${result.totalRequirements}`)}`);
  console.log(`  Verified tasks:         ${pc.green(`${result.passedTasks}/${result.totalTasks}`)}`);

  if (result.failedRequirements > 0 || result.failedTasks > 0 || (result.failedUseCaseFlows || 0) > 0) {
    console.log(pc.red('\n  Items lacking executable tests:'));
    printTestingFailures(result);
  }
  console.log(result.success ? pc.green('\n✔ Test Coverage COMPLIANT (100%)\n') : pc.red('\n✖ Test Coverage INSUFFICIENT\n'));
}

export function runVerifyTesting(options: TestingVerifyOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);
  if (!isSilent) {
    console.log(pc.bold(pc.cyan('\n🔍 [AI-SDLC] Verifying Test Coverage in Requirements and Tasks...')));
  }

  const result = verifyTestingCoverage({ rootDir });

  if (useJson) {
    emitTestingJson(result);
    return result.success;
  }
  if (!options.silent) {
    printTestingConsole(result);
  }
  return result.success;
}

export interface LicenseVerifyOptions extends VerifyBaseOptions {
  vuln?: boolean;
  policy?: string;
  manifest?: string;
  dynamic?: boolean;
  tool?: 'native' | 'license-checker' | 'trivy' | 'syft';
  depth?: 'direct' | 'transitive';
  sbom?: boolean | string;
  notices?: boolean | string;
}

function emitLicensesJson(result: ReturnType<typeof verifyLicenses>): void {
  const payload: VerifyJsonPayload = {
    gate: 'licenses',
    success: result.success,
    exitCode: result.success ? 0 : 1,
    summary: {
      totalEvaluated: result.totalEvaluated,
      permittedCount: result.permittedCount,
      violationsCount: result.violations.length,
    },
    violations: result.violations.map((v) => ({
      package: v.packageName,
      version: v.version,
      license: v.license,
      category: v.category,
      message: v.reason,
    })),
    artifacts: {
      sbomPath: result.sbomPath,
      noticesPath: result.noticesPath,
    },
  };
  console.log(JSON.stringify(payload, null, 2));
}

function printDetectedVulnerabilities(vulnerabilities?: Array<{ severity: string; id: string; packageName: string; installedVersion: string; cvssV3Score?: number; primaryUrl?: string }>): void {
  if (!vulnerabilities || vulnerabilities.length === 0) return;
  console.log(pc.yellow('\n  Detected package vulnerabilities (CVE/GHSA):'));
  for (const v of vulnerabilities) {
    console.log(`    ${pc.red('✖')} [${v.severity}] [${v.id}] ${v.packageName}@${v.installedVersion} (CVSS: ${v.cvssV3Score ?? 'N/A'}): ${v.primaryUrl || ''}`);
  }
}

function printLicenseArtifacts(sbomPath?: string, noticesPath?: string): void {
  if (sbomPath) console.log(`  CycloneDX SBOM generated: ${pc.cyan(sbomPath)}`);
  if (noticesPath) console.log(`  Legal notices generated:  ${pc.cyan(noticesPath)}`);
}

function printLicenseViolations(violations: Array<{ category: string; packageName: string; license: string; reason: string }>): void {
  if (violations.length === 0) return;
  console.log(pc.red('\n  Detected license violations:'));
  for (const v of violations) {
    console.log(`    ${pc.red('✖')} [${v.category}] ${v.packageName} (${v.license}): ${v.reason}`);
  }
}

function printLicensesConsole(result: ReturnType<typeof verifyLicenses>): void {
  console.log(`  Evaluated dependencies:   ${pc.bold(String(result.totalEvaluated))}`);
  console.log(`  Compliant dependencies:   ${pc.green(String(result.permittedCount))}`);
  console.log(`  License violations:       ${result.violations.length > 0 ? pc.red(String(result.violations.length)) : pc.green('0')}`);
  printLicenseArtifacts(result.sbomPath, result.noticesPath);
  printLicenseViolations(result.violations);
  if (result.vulnerabilitiesSkipped) {
    console.log(pc.gray('  Vulnerabilities (CVE/GHSA): skipped (Trivy not installed in environment; enforced in CI)'));
  } else {
    printDetectedVulnerabilities(result.vulnerabilities);
  }
  console.log(result.success ? pc.green('\n✔ OSS License Governance COMPLIANT\n') : pc.red('\n✖ OSS License Governance BLOCKED\n'));
}

function buildLicenseVerifyInput(options: LicenseVerifyOptions, rootDir: string) {
  return {
    rootDir,
    policyPath: options.policy,
    manifestPath: options.manifest,
    dynamic: options.dynamic,
    tool: options.tool,
    depth: options.depth,
    generateSbom: options.sbom !== undefined ? Boolean(options.sbom) : undefined,
    sbomPath: typeof options.sbom === 'string' ? options.sbom : undefined,
    generateNotices: options.notices !== undefined ? Boolean(options.notices) : undefined,
    noticesPath: typeof options.notices === 'string' ? options.notices : undefined,
    scanVulnerabilities: options.vuln !== undefined ? Boolean(options.vuln) : undefined,
  };
}

export function runVerifyLicenses(options: LicenseVerifyOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
  if (!options.silent && !useJson) {
    console.log(pc.bold(pc.cyan('\n🔍 [AI-SDLC] Verifying Open Source License Compliance (SCA)...')));
  }

  const result = verifyLicenses(buildLicenseVerifyInput(options, rootDir));

  if (useJson) {
    emitLicensesJson(result);
  } else if (!options.silent) {
    printLicensesConsole(result);
  }
  return result.success;
}

export interface PdacVerifyOptions extends VerifyBaseOptions {}

function buildPdacViolations(result: ReturnType<typeof verifyPdacGraph>) {
  const drifts = result.drifts.map((d) => ({
    sourceId: d.sourceId,
    targetId: d.targetId,
    sourceFile: d.sourceFile,
    expectedDigest: d.expectedDigest,
    actualDigest: d.actualDigest,
    message: `Cryptographic drift in ${d.sourceFile} citing ${d.targetId}`,
  }));
  const unresolved = (result.unresolvedCitations || []).map((u) => ({
    sourceId: u.sourceFile,
    targetId: u.targetId,
    sourceFile: u.sourceFile,
    message: `Unresolved citation in ${u.sourceFile} citing non-existent artifact '${u.targetId}'`,
  }));
  const anchors = (result.invalidAnchors || []).map((a) => ({
    sourceId: a.sourceFile,
    targetId: a.targetId,
    sourceFile: a.sourceFile,
    message: a.reason,
  }));
  return [...drifts, ...unresolved, ...anchors];
}

function emitPdacJson(result: ReturnType<typeof verifyPdacGraph>): void {
  const payload: VerifyJsonPayload = {
    gate: 'pdac',
    success: result.success,
    exitCode: result.success ? 0 : 1,
    summary: {
      totalNodes: result.totalNodes,
      totalEdges: result.totalEdges,
      driftCount: result.drifts.length,
      unresolvedCount: result.unresolvedCount || 0,
      invalidAnchorCount: result.invalidAnchors?.length || 0,
    },
    violations: buildPdacViolations(result),
  };
  console.log(JSON.stringify(payload, null, 2));
}

function printDrifts(drifts: ReturnType<typeof verifyPdacGraph>['drifts']): void {
  if (drifts.length === 0) return;
  console.log(pc.red('\n  Detected drifts (Status: STALE):'));
  for (const d of drifts) {
    console.log(`    ${pc.red('✖')} In ${d.sourceFile} citing ${d.targetId}: misaligned digest.`);
  }
}

function printUnresolved(unresolved: ReturnType<typeof verifyPdacGraph>['unresolvedCitations']): void {
  if (!unresolved || unresolved.length === 0) return;
  console.log(pc.red('\n  Unresolved citations:'));
  for (const u of unresolved) {
    console.log(`    ${pc.red('✖')} In ${u.sourceFile}: references non-existent artifact '${u.targetId}'.`);
  }
}

function printInvalidAnchors(anchors: ReturnType<typeof verifyPdacGraph>['invalidAnchors']): void {
  if (!anchors || anchors.length === 0) return;
  console.log(pc.red('\n  Invalid anchors:'));
  for (const a of anchors) {
    console.log(`    ${pc.red('✖')} In ${a.sourceFile}: ${a.reason}`);
  }
}

function printPdacConsole(result: ReturnType<typeof verifyPdacGraph>): void {
  console.log(`  PDaC baseline nodes:    ${pc.bold(String(result.totalNodes))}`);
  console.log(`  Evaluated citations:    ${pc.bold(String(result.totalEdges))}`);
  console.log(`  Cryptographic drifts:   ${result.drifts.length > 0 ? pc.red(String(result.drifts.length)) : pc.green('0')}`);
  if (result.unresolvedCount && result.unresolvedCount > 0) {
    console.log(`  Unresolved citations:   ${pc.red(String(result.unresolvedCount))}`);
  }
  if (result.invalidAnchors && result.invalidAnchors.length > 0) {
    console.log(`  Invalid anchors:        ${pc.red(String(result.invalidAnchors.length))}`);
  }

  printDrifts(result.drifts);
  printUnresolved(result.unresolvedCitations);
  printInvalidAnchors(result.invalidAnchors);

  console.log(result.success ? pc.green('\n✔ PDaC Graph Free of Drift and Fully Verified\n') : pc.red('\n✖ PDaC Verification Failed (Drift, Unresolved Citations, or Invalid Anchors)\n'));
}

export function runVerifyPdac(options: PdacVerifyOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);
  if (!isSilent) {
    console.log(pc.bold(pc.cyan('\n🔍 [AI-SDLC] Verifying PDaC Graph and Cryptographic Drift (SHA-256)...')));
  }

  const result = verifyPdacGraph({ rootDir });

  if (useJson) {
    emitPdacJson(result);
    return result.success;
  }
  if (!options.silent) {
    printPdacConsole(result);
  }
  return result.success;
}

export interface SchemasVerifyOptions extends VerifyBaseOptions {
  path?: string;
}

function emitSchemasJson(result: ReturnType<typeof verifyArtifactsSchemas>): void {
  const payload: VerifyJsonPayload = {
    gate: 'schemas',
    success: result.success,
    exitCode: result.success ? 0 : 1,
    summary: {
      totalEvaluated: result.totalEvaluated,
      validCount: result.validCount,
      invalidCount: result.invalidCount,
    },
    violations: result.violations.map((v) => ({
      file: v.filePath,
      id: v.id,
      schemaId: v.schemaId,
      property: v.property,
      message: v.message,
    })),
  };
  console.log(JSON.stringify(payload, null, 2));
}

function printSchemasConsole(result: ReturnType<typeof verifyArtifactsSchemas>): void {
  console.log(`  Evaluated artifacts:    ${pc.bold(String(result.totalEvaluated))}`);
  console.log(`  Compliant artifacts:    ${pc.green(String(result.validCount))}`);
  console.log(`  Schema violations:      ${result.invalidCount > 0 ? pc.red(String(result.invalidCount)) : pc.green('0')}`);

  if (result.violations.length > 0) {
    console.log(pc.red('\n  Detected JSON schema violations:'));
    for (const v of result.violations) {
      console.log(`    ${pc.red('✖')} [${v.id || v.filePath}] (${v.schemaId || 'schema'}): ${v.message}`);
    }
  }
  console.log(result.success ? pc.green('\n✔ Artifact Schemas COMPLIANT (100%)\n') : pc.red('\n✖ Artifact Schemas BLOCKED\n'));
}

export function runVerifySchemas(options: SchemasVerifyOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);
  if (!isSilent) {
    console.log(pc.bold(pc.cyan('\n🔍 [AI-SDLC] Verifying JSON Schemas Compliance (Draft 2020-12)...')));
  }

  const result = verifyArtifactsSchemas({ rootDir, targetPath: options.path });

  if (useJson) {
    emitSchemasJson(result);
    return result.success;
  }
  if (!options.silent) {
    printSchemasConsole(result);
  }
  return result.success;
}

export interface FrictionVerifyOptions extends VerifyBaseOptions {
  change?: string;
  diffFiles?: string[];
}

function emitFrictionJson(result: ReturnType<typeof verifyProgressiveFriction>): void {
  const violations = [
    ...result.bypassedRules.map((rule) => ({ type: 'ANTI_BYPASS', message: rule })),
    ...result.errors.map((err) => ({ type: 'PROFILE_ERROR', message: err })),
  ];
  const payload: VerifyJsonPayload = {
    gate: 'friction',
    success: result.success,
    exitCode: result.success ? 0 : 1,
    summary: {
      profile: result.profile,
      evaluatedFilesCount: result.evaluatedFiles.length,
      bypassed: result.bypassed,
    },
    violations,
  };
  console.log(JSON.stringify(payload, null, 2));
}

function printFrictionConsole(result: ReturnType<typeof verifyProgressiveFriction>): void {
  console.log(`  Detected profile:        ${pc.magenta(result.profile)}`);
  console.log(`  Evaluated files:         ${pc.bold(String(result.evaluatedFiles.length))}`);
  if (result.bypassedRules.length > 0) {
    console.log(pc.red('\n  Anti-Bypass violations detected:'));
    for (const rule of result.bypassedRules) {
      console.log(`    ${pc.red('✖')} ${rule}`);
    }
  }
  if (result.errors.length > 0) {
    console.log(pc.red('\n  Profile validation errors:'));
    for (const err of result.errors) {
      console.log(`    ${pc.red('✖')} ${err}`);
    }
  }
  console.log(
    result.success
      ? pc.green('\n✔ Progressive Friction COMPLIANT (EXIT 0)\n')
      : pc.red('\n✖ Progressive Friction BLOCKED (EXIT 1)\n')
  );
}

export function runVerifyFriction(options: FrictionVerifyOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);
  if (!isSilent) {
    console.log(pc.bold(pc.cyan('\n🛡️  [AI-SDLC] Verifying Progressive Friction and Anti-Bypass Guardrails...')));
  }

  const result = verifyProgressiveFriction({
    rootDir,
    changeId: options.change,
    diffFiles: options.diffFiles,
  });

  if (useJson) {
    emitFrictionJson(result);
    return result.success;
  }
  if (!options.silent) {
    printFrictionConsole(result);
  }
  return result.success;
}

export interface DuplicatesVerifyOptions extends VerifyBaseOptions {
  similarity?: number | string;
}

function emitDuplicatesJson(result: ReturnType<typeof verifyArtifactDuplicates>): void {
  const payload: VerifyJsonPayload = {
    gate: 'duplicates',
    success: result.success,
    exitCode: result.success ? 0 : 1,
    summary: {
      totalRequirements: result.totalRequirements,
      errorCount: result.errorCount,
      warningCount: result.warningCount,
    },
    violations: result.issues.map((i) => ({
      type: i.type,
      severity: i.severity,
      id: i.id,
      file: i.file,
      conflictingId: i.conflictingId,
      message: i.message,
    })),
  };
  console.log(JSON.stringify(payload, null, 2));
}

function printDuplicatesConsole(result: ReturnType<typeof verifyArtifactDuplicates>): void {
  console.log(`  Evaluated requirements:  ${pc.bold(String(result.totalRequirements))}`);
  console.log(`  Duplication errors:      ${result.errorCount > 0 ? pc.red(String(result.errorCount)) : pc.green('0')}`);
  console.log(`  Warnings:                ${result.warningCount > 0 ? pc.yellow(String(result.warningCount)) : pc.green('0')}`);

  if (result.issues.length > 0) {
    console.log(pc.red('\n  Detected issues:'));
    for (const issue of result.issues) {
      const icon = issue.severity === 'ERROR' ? pc.red('✖') : pc.yellow('⚠');
      const badge = issue.severity === 'ERROR' ? pc.red(`[${issue.type}]`) : pc.yellow(`[${issue.type}]`);
      console.log(`    ${icon} ${badge} [${issue.id}] in ${issue.file}: ${issue.message}`);
    }
  }
  console.log(
    result.success
      ? pc.green('\n✔ Duplicates Verification COMPLIANT (0 Collisions)\n')
      : pc.red('\n✖ Duplicates Verification BLOCKED (Collisions Detected)\n')
  );
}

export function runVerifyDuplicates(options: DuplicatesVerifyOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const similarityThreshold = options.similarity !== undefined ? Number(options.similarity) : undefined;
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);

  if (!isSilent) {
    console.log(pc.bold(pc.cyan('\n🔍 [AI-SDLC] Verifying Duplicate Requirements and Redundancy (Shift-Left Pre-Flight)...')));
  }

  const result = verifyArtifactDuplicates({
    rootDir,
    titleSimilarityThreshold: similarityThreshold,
  });

  if (useJson) {
    emitDuplicatesJson(result);
    return result.success;
  }
  if (!options.silent) {
    printDuplicatesConsole(result);
  }
  return result.success;
}

export interface SecretVerifyCliOptions extends VerifyBaseOptions {
  diff?: boolean;
  base?: string;
  gitleaks?: boolean;
  entropy?: number | string;
}

function emitSecretsJson(result: ReturnType<typeof verifySecrets>): void {
  const payload: VerifyJsonPayload = {
    gate: 'secrets',
    success: result.success,
    exitCode: result.success ? 0 : 4,
    summary: {
      totalFilesScanned: result.totalFilesScanned,
      findingsCount: result.findingsCount,
      scannedWithGitleaks: result.scannedWithGitleaks,
    },
    violations: result.findings.map((f) => ({
      ruleId: f.ruleId,
      file: f.relPath,
      line: f.lineNumber,
      type: f.type,
      maskedMatch: f.maskedMatch,
      message: f.message,
    })),
  };
  console.log(JSON.stringify(payload, null, 2));
}

function printSecretsConsole(result: ReturnType<typeof verifySecrets>): void {
  console.log(`  Analyzed files:          ${pc.bold(String(result.totalFilesScanned))}`);
  console.log(`  Credential leaks:        ${result.findingsCount > 0 ? pc.red(String(result.findingsCount)) : pc.green('0')}`);
  console.log(`  Native Gitleaks engine:  ${result.scannedWithGitleaks ? pc.cyan('Active / Integrated') : pc.dim('Deterministic Scanner (@aisdlc/core)')}`);

  if (result.findings.length > 0) {
    console.log(pc.red('\n  Detected exposed credentials:'));
    for (const f of result.findings) {
      console.log(`    ${pc.red('✖')} [${f.ruleId}] ${pc.bold(`${f.relPath}:${f.lineNumber}`)}: ${f.maskedMatch} - ${f.message}`);
    }
  }
  console.log(result.success ? pc.green('\n✔ Secrets Detection COMPLIANT (0 Credential Leaks)\n') : pc.red('\n✖ Secrets Detection BLOCKED (Exit Code 4: Exposed Secret)\n'));
}

function emitSecretsSarif(result: ReturnType<typeof verifySecrets>, output?: string): void {
  const doc = generateSecuritySarifReport({ secretsResult: result });
  if (output) {
    writeSecuritySarifReport(output, doc);
  } else {
    console.log(serializeSarifDocument(doc));
  }
}

function handleSecretsOutput(
  result: ReturnType<typeof verifySecrets>,
  options: SecretVerifyCliOptions,
  useSarif: boolean,
  useJson: boolean
): boolean {
  if (useSarif || options.output) {
    emitSecretsSarif(result, options.output);
    return result.success;
  }
  if (useJson) {
    emitSecretsJson(result);
    return result.success;
  }
  if (!options.silent) {
    printSecretsConsole(result);
  }
  return result.success;
}

export function runVerifySecrets(options: SecretVerifyCliOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const entropyThreshold = options.entropy !== undefined ? Number(options.entropy) : undefined;
  const useJson = isJsonOutput(options);
  const useSarif = isSarifOutput(options);

  if (!options.silent && !useJson && !useSarif) {
    console.log(pc.bold(pc.cyan("\n🔐 [AI-SDLC] Verifying Deterministic Secrets and Credentials Detection (Gitleaks Gate)...")));
  }

  const result = verifySecrets({
    rootDir,
    diff: options.diff,
    baseBranch: options.base,
    gitleaks: options.gitleaks,
    entropyThreshold,
  });

  return handleSecretsOutput(result, options, useSarif, useJson);
}

export interface SastVerifyCliOptions extends VerifyBaseOptions {
  semgrep?: boolean;
  minSeverity?: string;
}

function emitSastJson(result: ReturnType<typeof verifySast>): void {
  const payload: VerifyJsonPayload = {
    gate: 'sast',
    success: result.success,
    exitCode: result.success ? 0 : 1,
    summary: {
      totalFilesScanned: result.totalFilesScanned,
      violationsCount: result.violationsCount,
    },
    violations: result.violations.map((v) => ({
      ruleId: v.ruleId,
      file: v.relPath,
      line: v.lineNumber,
      type: v.type,
      severity: v.severity,
      message: v.message,
    })),
  };
  console.log(JSON.stringify(payload, null, 2));
}

function printSastConsole(result: ReturnType<typeof verifySast>): void {
  console.log(`  Evaluated files:         ${pc.bold(String(result.totalFilesScanned))}`);
  console.log(`  SAST vulnerabilities:    ${result.violationsCount > 0 ? pc.red(String(result.violationsCount)) : pc.green('0')}`);

  if (result.violations.length > 0) {
    console.log(pc.red('\n  Detected vulnerabilities:'));
    for (const v of result.violations) {
      console.log(`    ${pc.red('✖')} [${v.severity}] [${v.ruleId}] ${pc.bold(`${v.relPath}:${v.lineNumber}`)}: ${v.message}`);
    }
  }
  console.log(result.success ? pc.green('\n✔ SAST Analysis COMPLIANT (0 Critical Vulnerabilities)\n') : pc.red('\n✖ SAST Analysis BLOCKED (Vulnerabilities Detected)\n'));
}

function emitSastSarif(result: ReturnType<typeof verifySast>, output?: string): void {
  const doc = generateSecuritySarifReport({ sastResult: result });
  if (output) {
    writeSecuritySarifReport(output, doc);
  } else {
    console.log(serializeSarifDocument(doc));
  }
}

function handleSastOutput(
  result: ReturnType<typeof verifySast>,
  options: SastVerifyCliOptions,
  useSarif: boolean,
  useJson: boolean
): boolean {
  if (useSarif || options.output) {
    emitSastSarif(result, options.output);
    return result.success;
  }
  if (useJson) {
    emitSastJson(result);
    return result.success;
  }
  if (!options.silent) {
    printSastConsole(result);
  }
  return result.success;
}

export function runVerifySast(options: SastVerifyCliOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
  const useSarif = isSarifOutput(options);

  if (!options.silent && !useJson && !useSarif) {
    console.log(pc.bold(pc.cyan("\n🛡️  [AI-SDLC] Verifying Shift-Left SAST Security (Injections & OWASP Top 10)...")));
  }

  const result = verifySast({
    rootDir,
    semgrep: options.semgrep,
    minSeverity: options.minSeverity as SastSeverity,
  });

  return handleSastOutput(result, options, useSarif, useJson);
}

export interface SecurityVerifyCliOptions extends VerifyBaseOptions {
  diff?: boolean;
  base?: string;
  gitleaks?: boolean;
  semgrep?: boolean;
  entropy?: number | string;
  minSeverity?: string;
}

function buildSecurityViolations(
  resultSecrets: ReturnType<typeof verifySecrets>,
  resultSast: ReturnType<typeof verifySast>
) {
  const secretViolations = resultSecrets.findings.map((f) => ({
    type: 'SECRET',
    ruleId: f.ruleId,
    file: f.relPath,
    line: f.lineNumber,
    message: f.message,
  }));
  const sastViolations = resultSast.violations.map((v) => ({
    type: 'SAST',
    ruleId: v.ruleId,
    file: v.relPath,
    line: v.lineNumber,
    severity: v.severity,
    message: v.message,
  }));
  return [...secretViolations, ...sastViolations];
}

function emitSecurityJson(
  resultSecrets: ReturnType<typeof verifySecrets>,
  resultSast: ReturnType<typeof verifySast>,
  isOk: boolean
): void {
  const exitCode = isOk ? 0 : (!resultSecrets.success ? 4 : 1);
  const payload: VerifyJsonPayload = {
    gate: 'security',
    success: isOk,
    exitCode,
    summary: {
      secretsScanned: resultSecrets.totalFilesScanned,
      secretFindings: resultSecrets.findingsCount,
      sastScanned: resultSast.totalFilesScanned,
      sastViolations: resultSast.violationsCount,
    },
    violations: buildSecurityViolations(resultSecrets, resultSast),
  };
  console.log(JSON.stringify(payload, null, 2));
}

function writeSuppressionsAuditReport(rootDir: string, suppressions: SecuritySuppression[]): void {
  const targetPath = path.join(rootDir, 'reports', 'SUPPRESSIONS_AUDIT.md');
  writeReportFileIfChanged(targetPath, generateSuppressionsAuditReport(suppressions));
}

function executeSecurityVerifiers(rootDir: string, options: SecurityVerifyCliOptions) {
  const entropyThreshold = options.entropy !== undefined ? Number(options.entropy) : undefined;
  const resultSecrets = verifySecrets({
    rootDir,
    diff: options.diff,
    baseBranch: options.base,
    gitleaks: options.gitleaks,
    entropyThreshold,
  });

  const resultSast = verifySast({
    rootDir,
    semgrep: options.semgrep,
    minSeverity: options.minSeverity as SastSeverity,
  });

  return { resultSecrets, resultSast };
}

function printSecurityConsoleSummary(silent: boolean | undefined, hasExpired: boolean): void {
  if (silent) return;
  console.log(`  Audit exceptions report: ${pc.cyan('reports/SUPPRESSIONS_AUDIT.md')}`);
  if (hasExpired) {
    console.log(pc.red('  ✖ One or more security suppressions have expired! Quality Gate blocked.\n'));
  }
}

function persistSecuritySarif(
  rootDir: string,
  resultSecrets: ReturnType<typeof verifySecrets>,
  resultSast: ReturnType<typeof verifySast>,
  customOutput?: string
): void {
  const doc = generateSecuritySarifReport({
    secretsResult: resultSecrets,
    sastResult: resultSast,
  });
  const targetPath = customOutput || path.join(rootDir, "reports", "security.sarif");
  writeSecuritySarifReport(targetPath, doc);
}

function handleSecurityOutput(
  options: SecurityVerifyCliOptions,
  resultSecrets: ReturnType<typeof verifySecrets>,
  resultSast: ReturnType<typeof verifySast>,
  isOk: boolean,
  hasExpired: boolean
): boolean {
  if (isSarifOutput(options)) {
    if (!options.output) {
      const doc = generateSecuritySarifReport({
        secretsResult: resultSecrets,
        sastResult: resultSast,
      });
      console.log(serializeSarifDocument(doc));
    }
    return isOk;
  }
  if (isJsonOutput(options)) {
    emitSecurityJson(resultSecrets, resultSast, isOk);
    return isOk;
  }
  const okS = runVerifySecrets({ ...options, silent: options.silent });
  const okA = runVerifySast({ ...options, silent: options.silent });
  printSecurityConsoleSummary(options.silent, hasExpired);
  return okS && okA && !hasExpired;
}

export function runVerifySecurity(options: SecurityVerifyCliOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const { resultSecrets, resultSast } = executeSecurityVerifiers(rootDir, options);

  const allSuppressions = [
    ...(resultSecrets.suppressions || []),
    ...(resultSast.suppressions || []),
  ];
  writeSuppressionsAuditReport(rootDir, allSuppressions);
  persistSecuritySarif(rootDir, resultSecrets, resultSast, options.output);

  const hasExpired = allSuppressions.some((s) => s.status === "expired");
  const isOk = resultSecrets.success && resultSast.success && !hasExpired;

  return handleSecurityOutput(options, resultSecrets, resultSast, isOk, hasExpired);
}

function emitGherkinVerifyJson(result: ReturnType<typeof checkGherkinInSync>): void {
  const violations = [
    ...result.missingFiles.map((f) => ({
      type: 'MISSING_FEATURE',
      file: f,
      message: `Missing .feature file: ${f}`,
    })),
    ...result.outOfSyncFiles.map((f) => ({
      type: 'OUT_OF_SYNC_FEATURE',
      file: f,
      message: `Out-of-sync .feature file: ${f}`,
    })),
  ];
  const payload: VerifyJsonPayload = {
    gate: 'gherkin',
    success: result.inSync,
    exitCode: result.inSync ? 0 : 1,
    summary: {
      totalFeatures: result.totalFeatures,
      missingCount: result.missingFiles.length,
      outOfSyncCount: result.outOfSyncFiles.length,
    },
    violations,
  };
  console.log(JSON.stringify(payload, null, 2));
}

function printGherkinVerifyConsole(result: ReturnType<typeof checkGherkinInSync>): void {
  const totalOut = result.missingFiles.length + result.outOfSyncFiles.length;
  console.log(`  Evaluated features:      ${pc.bold(String(result.totalFeatures))}`);
  console.log(`  Out-of-sync / missing:   ${totalOut > 0 ? pc.red(String(totalOut)) : pc.green('0')}`);
  for (const f of result.missingFiles) {
    console.log(`    ${pc.red('✖')} [MISSING] ${f}`);
  }
  for (const f of result.outOfSyncFiles) {
    console.log(`    ${pc.red('✖')} [OUT_OF_SYNC] ${f}`);
  }
  console.log(result.inSync ? pc.green('\n✔ BDD Synchronization COMPLIANT\n') : pc.red('\n✖ BDD Synchronization BLOCKED\n'));
}

export function runVerifyGherkin(options: VerifyBaseOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);

  if (!isSilent) {
    console.log(pc.bold(pc.cyan('\n🥒 [AI-SDLC] Verifying BDD Synchronization (Gherkin -> .feature)...')));
  }

  const result = checkGherkinInSync({ rootDir });

  if (useJson) {
    emitGherkinVerifyJson(result);
    return result.inSync;
  }
  if (!options.silent) {
    printGherkinVerifyConsole(result);
  }
  return result.inSync;
}

export interface PrivacyVerifyCliOptions extends VerifyBaseOptions {
  policy?: string;
  ropaReport?: boolean | string;
  report?: boolean | string;
  minSeverity?: string;
}

function emitPrivacyJson(result: ReturnType<typeof verifyPrivacy>): void {
  const payload: VerifyJsonPayload = {
    gate: 'privacy',
    success: result.success,
    exitCode: result.success ? 0 : 5,
    summary: {
      totalFilesScanned: result.totalFilesScanned,
      dataAssetsCount: result.dataAssetsCount,
      ropaCount: result.ropaRecordsCount,
      ropaRecordsCount: result.ropaRecordsCount,
      privacyRequirementsCount: result.privacyRequirementsCount,
      violationsCount: result.violationsCount,
    },
    violations: result.violations,
    artifacts: {
      ropaInventoryPath: result.ropaOutputPath,
      reportPath: result.reportOutputPath,
    },
  };
  console.log(JSON.stringify(payload, null, 2));
}

function printPrivacyConsole(result: ReturnType<typeof verifyPrivacy>): void {
  console.log(`  Scanned source files:    ${pc.bold(String(result.totalFilesScanned))}`);
  console.log(`  Data assets (DATA-ASSET):${pc.bold(String(result.dataAssetsCount))}`);
  console.log(`  ROPA records (Art. 30):  ${pc.bold(String(result.ropaRecordsCount))}`);
  console.log(`  Privacy reqs (PRIV-REQ): ${pc.bold(String(result.privacyRequirementsCount))}`);
  console.log(`  Privacy violations:      ${result.violationsCount > 0 ? pc.red(String(result.violationsCount)) : pc.green('0')}`);
  if (result.ropaOutputPath) console.log(`  ROPA Inventory generated:${pc.cyan(result.ropaOutputPath)}`);
  if (result.reportOutputPath) console.log(`  Privacy Report generated:${pc.cyan(result.reportOutputPath)}`);
  if (result.violations.length > 0) {
    console.log(pc.red('\n  Detected privacy violations:'));
    for (const v of result.violations) {
      const loc = v.lineNumber ? `${v.relPath}:${v.lineNumber}` : v.relPath;
      console.log(`    ${pc.red('✖')} [${v.severity}] [${v.ruleId}] ${pc.bold(loc)}: ${v.message}`);
    }
  }
  console.log(result.success ? pc.green('\n✔ Data Protection & Privacy COMPLIANT\n') : pc.red('\n✖ Data Protection & Privacy BLOCKED (Exit Code 5)\n'));
}

function buildPrivacyVerifyInput(options: PrivacyVerifyCliOptions, rootDir: string) {
  return {
    rootDir,
    policyPath: options.policy,
    generateRopa: options.ropaReport !== undefined ? Boolean(options.ropaReport) : undefined,
    ropaOutputPath: typeof options.ropaReport === 'string' ? options.ropaReport : undefined,
    reportOutputPath:
      typeof options.report === 'string'
        ? options.report
        : options.report
          ? 'reports/PRIVACY_SCAN_REPORT.md'
          : undefined,
  };
}

export function runVerifyPrivacy(options: PrivacyVerifyCliOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);

  if (!isSilent) {
    console.log(pc.bold(pc.cyan('\n🔒 [AI-SDLC] Verifying Data Protection & Privacy-by-Design (GDPR / LOPDGDD / PII-SAST)...')));
  }

  const result = verifyPrivacy(buildPrivacyVerifyInput(options, rootDir));

  if (useJson) {
    emitPrivacyJson(result);
    return result.success;
  }
  if (!options.silent) {
    printPrivacyConsole(result);
  }
  return result.success;
}

function collectAllGates(options: QualityVerifyOptions, root: string, isSilent: boolean) {
  return {
    quality: { success: runVerifyQuality({ ...options, root, silent: isSilent, json: false }) },
    traceability: { success: runVerifyTraceability({ root, silent: isSilent, json: false }) },
    governance: { success: runVerifyGovernance({ root, silent: isSilent, json: false }) },
    testing: { success: runVerifyTesting({ root, silent: isSilent, json: false }) },
    gherkin: { success: runVerifyGherkin({ root, silent: isSilent, json: false }) },
    licenses: { success: runVerifyLicenses({ root, silent: isSilent, json: false }) },
    pdac: { success: runVerifyPdac({ root, silent: isSilent, json: false }) },
    schemas: { success: runVerifySchemas({ root, silent: isSilent, json: false }) },
    duplicates: { success: runVerifyDuplicates({ root, silent: isSilent, json: false }) },
    friction: { success: runVerifyFriction({ root, silent: isSilent, json: false }) },
    security: { success: runVerifySecurity({ root, silent: isSilent, json: false }) },
    privacy: { success: runVerifyPrivacy({ root, silent: isSilent, json: false }) },
  };
}

function resolveVerifyAllExitCode(allPassed: boolean, gatesSummary: Record<string, { success: boolean }>): number {
  if (allPassed) return 0;
  if (!gatesSummary.security?.success) return 4;
  if (!gatesSummary.privacy?.success) return 5;
  return 1;
}

function emitVerifyAllJson(gatesSummary: Record<string, { success: boolean }>, allPassed: boolean): void {
  const totalGates = Object.keys(gatesSummary).length;
  const passedCount = Object.values(gatesSummary).filter((g) => g.success).length;
  const failedCount = totalGates - passedCount;
  const exitCode = resolveVerifyAllExitCode(allPassed, gatesSummary);

  const violations = Object.entries(gatesSummary)
    .filter(([, g]) => !g.success)
    .map(([name]) => ({ gate: name, message: `Gate ${name} failed verification criteria` }));

  const payload: VerifyJsonPayload = {
    gate: 'all',
    success: allPassed,
    exitCode,
    summary: { totalGates, passedGates: passedCount, failedGates: failedCount },
    gates: gatesSummary,
    violations,
  };
  console.log(JSON.stringify(payload, null, 2));
}

const VERIFY_ALL_GATES_LIST: Array<{ key: string; title: string }> = [
  { key: 'quality', title: '  1.  Quality Gate (Complexity/Maintainability): ' },
  { key: 'traceability', title: '  2.  360° Traceability (RTM):                   ' },
  { key: 'governance', title: '  3.  Governance and Autonomy Modes:             ' },
  { key: 'testing', title: '  4.  Test Coverage (Reqs & Tasks):              ' },
  { key: 'gherkin', title: '  5.  BDD Synchronization (Gherkin -> .feature): ' },
  { key: 'licenses', title: '  6.  Open Source Licenses:                      ' },
  { key: 'pdac', title: '  7.  PDaC & Cryptographic Drift:                ' },
  { key: 'schemas', title: '  8.  Artifact JSON Schemas (+ Handoff YAML):    ' },
  { key: 'duplicates', title: '  9.  Duplicate Requirements (Shift-Left Gate):  ' },
  { key: 'friction', title: '  10. Progressive Friction & Anti-Bypass:        ' },
  { key: 'security', title: '  11. Shift-Left Security (Secrets & SAST):      ' },
  { key: 'privacy', title: '  12. Data Protection & Privacy (GDPR/PII-SAST): ' },
];

function printVerifyAllSummaryTable(gatesSummary: Record<string, { success: boolean }>, allPassed: boolean): void {
  console.log(pc.bold(pc.magenta('================================================================')));
  console.log(pc.bold('CI/CD EVALUATION SUMMARY:'));
  for (const item of VERIFY_ALL_GATES_LIST) {
    const passed = Boolean(gatesSummary[item.key]?.success);
    console.log(`${item.title}${passed ? pc.green('PASSED') : pc.red('FAILED')}`);
  }
  console.log(pc.bold(pc.magenta('================================================================')));

  if (allPassed) {
    console.log(pc.bold(pc.green('\n✨ FINAL VERDICT: REPOSITORY COMPLIANT WITH AI-SDLC STANDARD (EXIT 0)\n')));
  } else {
    console.log(pc.bold(pc.red('\n⛔ FINAL VERDICT: BLOCKED BY DETECTED VIOLATIONS (EXIT 1)\n')));
  }
}

export function runVerifyAll(options: QualityVerifyOptions = {}): boolean {
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);
  if (!isSilent) {
    console.log(pc.bold(pc.magenta('================================================================')));
    console.log(pc.bold(pc.magenta('          AI-SDLC: FULL QUALITY GATES AND GOVERNANCE SUITE      ')));
    console.log(pc.bold(pc.magenta('================================================================')));
  }

  const root = options.root || process.cwd();
  const gatesSummary = collectAllGates(options, root, isSilent);
  const allPassed = Object.values(gatesSummary).every((g) => g.success);

  if (useJson) {
    emitVerifyAllJson(gatesSummary, allPassed);
    return allPassed;
  }
  if (!options.silent) {
    printVerifyAllSummaryTable(gatesSummary, allPassed);
  }
  return allPassed;
}


