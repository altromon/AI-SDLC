/**
 * CLI Handler: aisdlc verify
 */

import pc from 'picocolors';
import {
  checkGherkinInSync,
  verifyArtifactDuplicates,
  verifyArtifactsSchemas,
  verifyLicenses,
  verifyPdacGraph,
  verifyProgressiveFriction,
  verifyQualityGate,
  verifySast,
  verifySecrets,
  verifyTasksGovernance,
  verifyTestingCoverage,
  verifyTraceability,
  type SastSeverity,
} from '@aisdlc/core';

export interface VerifyBaseOptions {
  root?: string;
  silent?: boolean;
  json?: boolean;
  format?: string;
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
}

function buildQualityViolations(results: ReturnType<typeof verifyQualityGate>['results']) {
  return results
    .filter((r) => r.status === 'FAIL')
    .flatMap((r) =>
      r.violations.map((v) => ({
        file: r.relPath,
        function: r.functionName,
        metric: 'quality',
        message: v,
        metrics: {
          loc: r.loc,
          cyclomatic: r.cyclomatic,
          cognitive: r.cognitive,
          maintainability: r.maintainability,
        },
      }))
    );
}

function emitQualityJson(result: ReturnType<typeof verifyQualityGate>): void {
  const violations = buildQualityViolations(result.results);
  const payload: VerifyJsonPayload = {
    gate: 'quality',
    success: result.success,
    exitCode: result.success ? 0 : 1,
    summary: {
      totalFiles: result.totalFiles,
      totalFunctions: result.totalFunctions,
      passCount: result.passCount,
      failCount: result.failCount,
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

function printQualityConsole(result: ReturnType<typeof verifyQualityGate>): void {
  const isPermissive = result.policy.enforce_mode === 'PERMISSIVE';
  console.log(
    `  Active thresholds:      CC <= ${result.policy.max_cyclomatic} | Cognitive <= ${result.policy.max_cognitive} | MI >= ${result.policy.min_maintainability} | Lines <= ${result.policy.max_function_lines} | Mode: ${result.policy.enforce_mode}`
  );
  console.log(`  Analyzed files:         ${pc.bold(String(result.totalFiles))}`);
  console.log(`  Evaluated functions:    ${pc.bold(String(result.totalFunctions))}`);
  console.log(`  Compliant functions:    ${pc.green(String(result.passCount))}`);
  console.log(`  Failing functions:      ${result.failCount > 0 ? (isPermissive ? pc.yellow(String(result.failCount)) : pc.red(String(result.failCount))) : pc.green('0')}`);

  if (result.failCount > 0) {
    printQualityFailingDetails(result.results.filter((r) => r.status === 'FAIL'), isPermissive);
  }

  const tag = isPermissive && result.failCount > 0 ? ' (PERMISSIVE mode)' : '';
  console.log(result.success ? pc.green(`\n✔ Release Gate PASSED${tag}\n`) : pc.red('\n✖ Release Gate BLOCKED\n'));
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
  });

  if (useJson) {
    emitQualityJson(result);
  } else if (!options.silent) {
    printQualityConsole(result);
  }
  return result.success;
}

export interface TraceabilityVerifyOptions extends VerifyBaseOptions {}

function emitTraceabilityJson(result: ReturnType<typeof verifyTraceability>): void {
  const payload: VerifyJsonPayload = {
    gate: 'traceability',
    success: result.success,
    exitCode: result.success ? 0 : 1,
    summary: {
      totalRequirements: result.totalRequirements,
      conformingCount: result.totalRequirements - result.orphanCount,
      orphanCount: result.orphanCount,
    },
    violations: result.orphans.map((o) => ({
      id: o.id,
      title: o.title,
      productStatus: o.productStatus,
      archStatus: o.archStatus,
      testStatus: o.testStatus,
      message: `Orphan requirement [${o.id}]`,
    })),
  };
  console.log(JSON.stringify(payload, null, 2));
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

function buildTestingViolations(result: ReturnType<typeof verifyTestingCoverage>) {
  const reqViolations = result.requirements
    .filter((r) => r.status !== 'VERIFICADO_CON_PRUEBA')
    .map((r) => ({
      type: 'REQUIREMENT',
      id: r.id,
      title: r.title,
      file: r.file,
      message: `Requirement without verifiable test [${r.id}]`,
    }));

  const taskViolations = result.tasks
    .filter((t) => t.status !== 'VERIFICADO_CON_PRUEBA')
    .map((t) => ({
      type: 'TASK',
      id: t.id,
      title: t.title,
      file: t.file,
      message: `Task without test verification [${t.id}]`,
    }));

  return [...reqViolations, ...taskViolations];
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
    },
    violations: buildTestingViolations(result),
  };
  console.log(JSON.stringify(payload, null, 2));
}

function printTestingConsole(result: ReturnType<typeof verifyTestingCoverage>): void {
  console.log(`  Verified requirements:  ${pc.green(`${result.passedRequirements}/${result.totalRequirements}`)}`);
  console.log(`  Verified tasks:         ${pc.green(`${result.passedTasks}/${result.totalTasks}`)}`);

  if (result.failedRequirements > 0 || result.failedTasks > 0) {
    console.log(pc.red('\n  Items lacking executable tests:'));
    for (const r of result.requirements.filter((r) => r.status !== 'VERIFICADO_CON_PRUEBA')) {
      console.log(`    ${pc.red('✖')} [Requirement: ${r.id}] ${r.title} (${r.file})`);
    }
    for (const t of result.tasks.filter((t) => t.status !== 'VERIFICADO_CON_PRUEBA')) {
      console.log(`    ${pc.red('✖')} [Task: ${t.id}] ${t.title} (${t.file})`);
    }
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

function printLicensesConsole(result: ReturnType<typeof verifyLicenses>): void {
  console.log(`  Evaluated dependencies:   ${pc.bold(String(result.totalEvaluated))}`);
  console.log(`  Compliant dependencies:   ${pc.green(String(result.permittedCount))}`);
  console.log(`  License violations:       ${result.violations.length > 0 ? pc.red(String(result.violations.length)) : pc.green('0')}`);
  if (result.sbomPath) {
    console.log(`  CycloneDX SBOM generated: ${pc.cyan(result.sbomPath)}`);
  }
  if (result.noticesPath) {
    console.log(`  Legal notices generated:  ${pc.cyan(result.noticesPath)}`);
  }

  if (result.violations.length > 0) {
    console.log(pc.red('\n  Detected license violations:'));
    for (const v of result.violations) {
      console.log(`    ${pc.red('✖')} [${v.category}] ${v.packageName} (${v.license}): ${v.reason}`);
    }
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

function emitPdacJson(result: ReturnType<typeof verifyPdacGraph>): void {
  const payload: VerifyJsonPayload = {
    gate: 'pdac',
    success: result.success,
    exitCode: result.success ? 0 : 1,
    summary: {
      totalNodes: result.totalNodes,
      totalEdges: result.totalEdges,
      driftCount: result.drifts.length,
    },
    violations: result.drifts.map((d) => ({
      sourceId: d.sourceId,
      targetId: d.targetId,
      sourceFile: d.sourceFile,
      expectedDigest: d.expectedDigest,
      actualDigest: d.actualDigest,
      message: `Cryptographic drift in ${d.sourceFile} citing ${d.targetId}`,
    })),
  };
  console.log(JSON.stringify(payload, null, 2));
}

function printPdacConsole(result: ReturnType<typeof verifyPdacGraph>): void {
  console.log(`  PDaC baseline nodes:    ${pc.bold(String(result.totalNodes))}`);
  console.log(`  Evaluated citations:    ${pc.bold(String(result.totalEdges))}`);
  console.log(`  Cryptographic drifts:   ${result.drifts.length > 0 ? pc.red(String(result.drifts.length)) : pc.green('0')}`);

  if (result.drifts.length > 0) {
    console.log(pc.red('\n  Detected drifts (Status: STALE):'));
    for (const d of result.drifts) {
      console.log(`    ${pc.red('✖')} In ${d.sourceFile} citing ${d.targetId}: misaligned digest.`);
    }
  }
  console.log(result.success ? pc.green('\n✔ PDaC Graph Free of Drift\n') : pc.red('\n✖ Cryptographic Drift Detected\n'));
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

export function runVerifySecrets(options: SecretVerifyCliOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const entropyThreshold = options.entropy !== undefined ? Number(options.entropy) : undefined;
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);

  if (!isSilent) {
    console.log(pc.bold(pc.cyan('\n🔐 [AI-SDLC] Verifying Deterministic Secrets and Credentials Detection (Gitleaks Gate)...')));
  }

  const result = verifySecrets({
    rootDir,
    diff: options.diff,
    baseBranch: options.base,
    gitleaks: options.gitleaks,
    entropyThreshold,
  });

  if (useJson) {
    emitSecretsJson(result);
    return result.success;
  }
  if (!options.silent) {
    printSecretsConsole(result);
  }
  return result.success;
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

export function runVerifySast(options: SastVerifyCliOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);

  if (!isSilent) {
    console.log(pc.bold(pc.cyan('\n🛡️  [AI-SDLC] Verifying Shift-Left SAST Security (Injections & OWASP Top 10)...')));
  }

  const result = verifySast({
    rootDir,
    semgrep: options.semgrep,
    minSeverity: options.minSeverity as SastSeverity,
  });

  if (useJson) {
    emitSastJson(result);
    return result.success;
  }
  if (!options.silent) {
    printSastConsole(result);
  }
  return result.success;
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

export function runVerifySecurity(options: SecurityVerifyCliOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
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

  const isOk = resultSecrets.success && resultSast.success;

  if (useJson) {
    emitSecurityJson(resultSecrets, resultSast, isOk);
    return isOk;
  }

  const okS = runVerifySecrets({ ...options, silent: options.silent });
  const okA = runVerifySast({ ...options, silent: options.silent });
  return okS && okA;
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
  };
}

function emitVerifyAllJson(gatesSummary: Record<string, { success: boolean }>, allPassed: boolean): void {
  const totalGates = Object.keys(gatesSummary).length;
  const passedCount = Object.values(gatesSummary).filter((g) => g.success).length;
  const failedCount = totalGates - passedCount;
  const okSecurity = gatesSummary.security.success;
  const exitCode = allPassed ? 0 : (!okSecurity ? 4 : 1);

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


