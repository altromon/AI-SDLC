/**
 * Cites: FR-025-STRUCTURED-JSON-VERIFY-001, FR-027-ENV-OUTPUT-JSON-001, FR-038-SECURITY-SUPPRESSION-AUDIT-001, FR-039-SCA-VULNERABILITY-DETECTION-001, FR-046-NATIVE-SDK-CLI-AST-001, FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001, FR-063-UI-E2E-MODALITY-GATE-001, FR-068-LANGUAGE-AGNOSTIC-TEST-STACK-001
 * Tag: @FR-025-STRUCTURED-JSON-VERIFY-001 @FR-027-ENV-OUTPUT-JSON-001 @FR-038-SECURITY-SUPPRESSION-AUDIT-001 @FR-039-SCA-VULNERABILITY-DETECTION-001 @FR-046-NATIVE-SDK-CLI-AST-001 @FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001 @FR-063-UI-E2E-MODALITY-GATE-001 @FR-068-LANGUAGE-AGNOSTIC-TEST-STACK-001
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PreflightCheckResult, PreflightGateSummary } from '@aisdlc/core';
import { computeCanonicalSha256, extractGherkinFeatures, verifyLicenses, verifyQualityGate, verifySast, verifySecrets } from '@aisdlc/core';
import {
  applyAutoFix,
  auditDuplicatesGate,
  auditFrictionGate,
  auditGherkinGate,
  auditGovernanceGate,
  auditLicensesGate,
  auditPdacGate,
  auditPrivacyGate,
  auditQualityGate,
  auditSchemasGate,
  auditSecretsGate,
  auditSecurityGate,
  auditTestingGate,
  auditTraceabilityGate,
  autoScaffoldMissingSteps,
  buildGherkinFailedGate,
  collectManifestDirs,
  collectPreflightGates,
  detectDefaultScaffoldLanguage,
  detectLanguageInDir,
  emitCheckJson,
  enqueueChildDirs,
  executePreflightCheck,
  formatLicenseFailure,
  formatNonMetricQualityFailure,
  formatQualityGateFailure,
  formatSecurityErrors,
  hasAnyFile,
  hasDotnetProjectFiles,
  normalizeScaffoldLanguage,
  printDashboardFooter,
  printDashboardHeader,
  readConfiguredScaffoldLanguage,
  readJsonConfigLanguage,
  readYamlPolicyLanguage,
  renderDashboard,
  renderGateBadge,
  renderRemediations,
  runAutoFix,
  runCheck,
} from '../src/commands/check.js';

describe('CLI check.ts helper and gate auditor unit suite (100% function coverage)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-check-helpers-'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('hasDotnetProjectFiles & detectDefaultScaffoldLanguage detect py, go, rs, cs, and return null when missing', () => {
    const missingDir = path.join(tmpDir, 'does-not-exist');
    expect(hasDotnetProjectFiles(missingDir)).toBe(false);
    expect(detectDefaultScaffoldLanguage(missingDir)).toBeNull();

    const csDir = path.join(tmpDir, 'cs-app');
    fs.mkdirSync(csDir, { recursive: true });
    fs.writeFileSync(path.join(csDir, 'MyApp.csproj'), '<Project />', 'utf-8');
    expect(hasDotnetProjectFiles(csDir)).toBe(true);
    expect(detectDefaultScaffoldLanguage(csDir)).toBe('cs');

    const slnDir = path.join(tmpDir, 'sln-app');
    fs.mkdirSync(slnDir, { recursive: true });
    fs.writeFileSync(path.join(slnDir, 'Solution.slnx'), '<Solution />', 'utf-8');
    expect(hasDotnetProjectFiles(slnDir)).toBe(true);
    expect(detectDefaultScaffoldLanguage(slnDir)).toBe('cs');

    const rsDir = path.join(tmpDir, 'rs-app');
    fs.mkdirSync(rsDir, { recursive: true });
    fs.writeFileSync(path.join(rsDir, 'Cargo.toml'), '[package]\nname="x"\n', 'utf-8');
    expect(detectDefaultScaffoldLanguage(rsDir)).toBe('rs');

    const goDir = path.join(tmpDir, 'go-app');
    fs.mkdirSync(goDir, { recursive: true });
    fs.writeFileSync(path.join(goDir, 'go.mod'), 'module example.com/app\n', 'utf-8');
    expect(detectDefaultScaffoldLanguage(goDir)).toBe('go');

    const pyDir = path.join(tmpDir, 'py-app');
    fs.mkdirSync(pyDir, { recursive: true });
    fs.writeFileSync(path.join(pyDir, 'pyproject.toml'), '[project]\nname="x"\n', 'utf-8');
    fs.writeFileSync(path.join(pyDir, 'go.mod'), 'module override\n', 'utf-8');
    // Priority: py precedes go/rs/cs
    expect(detectDefaultScaffoldLanguage(pyDir)).toBe('py');
  });

  it('autoScaffoldMissingSteps, runAutoFix, applyAutoFix & buildGherkinFailedGate handle missing steps and outputs', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    expect(autoScaffoldMissingSteps(tmpDir)).toBe(0);
    expect(applyAutoFix(tmpDir, true, false)).toEqual({ gherkinCount: 0, digestsCount: 0 });

    const prodDir = path.join(tmpDir, 'product');
    fs.mkdirSync(prodDir, { recursive: true });
    fs.writeFileSync(
      path.join(prodDir, 'FR-SAMPLE-001.md'),
      '---\nid: FR-SAMPLE-001\ntype: requirement\ntitle: Sample\n---\n```gherkin\nFeature: Sample\n  Scenario: Works\n    Given ready\n    When invoked\n    Then succeeds\n```\n',
      'utf-8'
    );
    extractGherkinFeatures({ rootDir: tmpDir });
    fs.writeFileSync(path.join(tmpDir, 'MySvc.csproj'), '<Project />', 'utf-8');

    const scaffolded = autoScaffoldMissingSteps(tmpDir);
    expect(scaffolded).toBe(1);
    expect(fs.existsSync(path.join(tmpDir, 'tests', 'steps', 'fr-sample-001Steps.cs'))).toBe(true);
    // Already scaffolded on second call -> 0
    expect(autoScaffoldMissingSteps(tmpDir)).toBe(0);

    // Add second markdown gherkin + stale PDaC citation for runAutoFix / applyAutoFix
    const chgDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-1');
    fs.mkdirSync(chgDir, { recursive: true });
    fs.writeFileSync(
      path.join(prodDir, 'FR-AUTO-001.md'),
      '---\nid: FR-AUTO-001\ntype: requirement\ntitle: Auto\n---\n```gherkin\nFeature: Auto\n  Scenario: S\n    Given a\n    Then b\n```\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(chgDir, 'spec.md'),
      '---\nid: CHG-1\ntype: spec\ncitations:\n  - id: FR-AUTO-001\n    digest: "sha256:0000"\n---\n# Spec\n',
      'utf-8'
    );

    const fixRes = applyAutoFix(tmpDir, false, true);
    expect(fixRes.gherkinCount).toBe(2);
    expect(fixRes.digestsCount).toBe(1);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[AUTO-FIX]'));

    logSpy.mockClear();
    const silentFix = runAutoFix(tmpDir, true);
    expect(silentFix.gherkinCount).toBe(2);
    expect(logSpy).not.toHaveBeenCalled();

    const stepFail = buildGherkinFailedGate(2, true);
    expect(stepFail.status).toBe('FAILED');
    expect(stepFail.remediation).toContain('aisdlc gherkin scaffold');

    const syncFail = buildGherkinFailedGate(0, false);
    expect(syncFail.message).toContain('0 Gherkin sync');
    expect(syncFail.remediation).toContain('aisdlc check --fix');
  });

  it('formatNonMetricQualityFailure, formatQualityGateFailure & auditQualityGate report metrics, untested fns, UI components, and coverage accurately (BUG-CHK-02)', () => {
    const baseRes = verifyQualityGate({ rootDir: tmpDir, requireCoverageReport: false });

    // 1. Metric violation
    const metricFail = formatQualityGateFailure({
      ...baseRes,
      success: false,
      failCount: 1,
      results: [
        {
          functionName: 'complexFn',
          filePath: 'src/a.ts',
          relPath: 'src/a.ts',
          loc: 55,
          cyclomatic: 14,
          cognitive: 18,
          maintainability: 42,
          codeSmells: [],
          status: 'FAIL',
          violations: ['Cyclomatic 14 > 10'],
        },
      ],
    });
    expect(metricFail.message).toContain('1 function(s) exceed quality thresholds');
    expect(metricFail.message).toContain('complexFn');
    expect(metricFail.remediation).toContain('Refactor');

    // 2. Missing unit tests only (BUG-CHK-02)
    const unitTestFail = formatQualityGateFailure({
      ...baseRes,
      success: false,
      failCount: 1,
      results: [
        {
          functionName: 'helperFn',
          filePath: 'src/a.ts',
          relPath: 'src/a.ts',
          loc: 5,
          cyclomatic: 1,
          cognitive: 0,
          maintainability: 75,
          codeSmells: [],
          status: 'FAIL',
          violations: ["Missing unit test for function 'helperFn'"],
        },
      ],
      untestedFunctions: [{ file: 'src/a.ts', functionName: 'helperFn' }],
    });
    expect(unitTestFail.message).toContain('1 function(s) missing unit tests');
    expect(unitTestFail.message).toContain('helperFn');
    expect(unitTestFail.remediation).toContain('Add unit tests');

    // 3. Untested UI component only with failCount === 0 (BUG-CHK-02)
    const uiOnlyFail = formatNonMetricQualityFailure({
      ...baseRes,
      success: false,
      failCount: 0,
      results: [],
      untestedFunctions: [],
      untestedUiComponents: [{ file: 'src/Button.tsx', componentName: 'Button' }],
    });
    expect(uiOnlyFail.message).toContain('1 UI component(s) missing driver tests');
    expect(uiOnlyFail.message).toContain('Button');
    expect(uiOnlyFail.remediation).toContain('UI/E2E');

    // 4. Coverage violation only with failCount === 0 (BUG-CHK-02)
    const covFail = formatNonMetricQualityFailure({
      ...baseRes,
      success: false,
      failCount: 0,
      results: [],
      untestedFunctions: [],
      untestedUiComponents: [],
      coverageViolations: ['Line coverage 40% < 80%'],
    });
    expect(covFail.message).toContain('1 coverage threshold violation');
    expect(covFail.remediation).toContain('Increase test coverage');

    // Real disk check: file with complex function triggers auditQualityGate FAILED
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    const branches = Array.from({ length: 14 }, (_, i) => `if (x === ${i}) return ${i};`).join('\n  ');
    fs.writeFileSync(path.join(tmpDir, 'src', 'bad.ts'), `export function tooComplex(x: number): number {\n  ${branches}\n  return -1;\n}\n`, 'utf-8');
    const qFail = auditQualityGate(tmpDir);
    expect(qFail.status).toBe('FAILED');
    expect(qFail.message).toContain('tooComplex');
  });

  it('formatLicenseFailure & auditLicensesGate handle license violations, CVE-blocked failures (BUG-CHK-03), and vuln flag', () => {
    const baseLic = verifyLicenses({ rootDir: tmpDir });

    const licFail = formatLicenseFailure({
      ...baseLic,
      success: false,
      violations: [{ packageName: 'gpl-dep', version: '1.0.0', license: 'GPL-3.0', reason: 'blocked', category: 'BLOCKED' }],
      vulnerabilities: [],
    });
    expect(licFail.message).toContain('1 prohibited license(s) detected: gpl-dep (GPL-3.0)');
    expect(licFail.remediation).toContain('license-policy.yaml');

    const vulnFail = formatLicenseFailure({
      ...baseLic,
      success: false,
      violations: [],
      vulnerabilities: [
        { id: 'CVE-2024-9999', packageName: 'vuln-pkg', installedVersion: '1.0.0', severity: 'CRITICAL' },
      ],
    });
    expect(vulnFail.message).toContain('1 blocking vulnerability(ies) detected: CVE-2024-9999 (vuln-pkg)');
    expect(vulnFail.remediation).toContain('VEX');

    const fallbackFail = formatLicenseFailure({ ...baseLic, success: false, violations: [], vulnerabilities: [] });
    expect(fallbackFail.message).toContain('License or vulnerability policy gate failed');

    // Real disk GPL violation
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test-app', version: '1.0.0', dependencies: { 'gpl-pkg': '1.0.0' } }),
      'utf-8'
    );
    const depDir = path.join(tmpDir, 'node_modules', 'gpl-pkg');
    fs.mkdirSync(depDir, { recursive: true });
    fs.writeFileSync(
      path.join(depDir, 'package.json'),
      JSON.stringify({ name: 'gpl-pkg', version: '1.0.0', license: 'GPL-3.0' }),
      'utf-8'
    );
    const gateFail = auditLicensesGate(tmpDir, false);
    expect(gateFail.status).toBe('FAILED');
    expect(gateFail.message).toContain('gpl-pkg');
  });

  it('formatSecurityErrors & auditSecurityGate handle active findings and expired suppressions without TypeError (BUG-CHK-01)', () => {
    const cleanSec = verifySecrets({ rootDir: tmpDir, gitleaks: false });
    const cleanSast = verifySast({ rootDir: tmpDir });
    expect(formatSecurityErrors(cleanSec, cleanSast)).toBe('');

    // BUG-CHK-01 regression: !success with empty findings/violations (expired suppression) must NOT throw
    const expiredSummary = formatSecurityErrors(
      { ...cleanSec, success: false, findingsCount: 0, findings: [] },
      { ...cleanSast, success: false, violationsCount: 0, violations: [] }
    );
    expect(expiredSummary).toContain('expired suppression(s)');
    expect(expiredSummary).toContain('SAST violation(s)');

    // Real disk expired secret suppression in tmpDir
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    const fakeGhp = ['ghp_', '9xK2mP8qR4tV7wZ1yB5nC3jL6fH0dS2aE4gU'].join('');
    const allowLine = ['// ', 'ai-sdlc:allow-secret ', 'expires=2020-01-01 reason=test'].join('');
    fs.writeFileSync(path.join(tmpDir, 'src', 'expired.ts'), `${allowLine}\nconst k = "${fakeGhp}";\n`, 'utf-8');
    const secGate = auditSecurityGate(tmpDir);
    expect(secGate.status).toBe('FAILED');
    expect(secGate.message.length).toBeGreaterThan(0);

    // Real SAST violation without secret
    fs.rmSync(path.join(tmpDir, 'src', 'expired.ts'));
    const dynEval = ['eval', '(userInput);'].join('');
    fs.writeFileSync(path.join(tmpDir, 'src', 'sqli.ts'), `export function run(userInput: string) { return ${dynEval} }\n`, 'utf-8');
    const sastGate = auditSecurityGate(tmpDir);
    expect(sastGate.status).toBe('FAILED');
    expect(sastGate.message).toContain('SAST violation(s)');
  });

  it('failure paths for auditGherkinGate, auditPdacGate, auditTraceabilityGate, auditGovernanceGate, auditTestingGate, auditSchemasGate, auditSecretsGate, auditDuplicatesGate, auditFrictionGate & auditPrivacyGate', () => {
    // 1. Gherkin & PDaC failures
    const prodDir = path.join(tmpDir, 'product', 'requirements');
    const chgDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-patch');
    fs.mkdirSync(prodDir, { recursive: true });
    fs.mkdirSync(chgDir, { recursive: true });
    const frText = [
      '---',
      'id: FR-FAIL-001',
      'type: requirement',
      'title: Failing Requirement',
      '---',
      '```gherkin',
      'Feature: Fail',
      '  Scenario: Missing',
      '    Given x',
      '    Then y',
      '```',
    ].join('\n');
    fs.writeFileSync(path.join(prodDir, 'FR-FAIL-001.md'), frText, 'utf-8');
    fs.writeFileSync(path.join(prodDir, 'FR-DUP-002.md'), '---\nid: FR-FAIL-001\ntype: requirement\ntitle: Dup\n---\n', 'utf-8');
    fs.writeFileSync(path.join(prodDir, 'FR-BAD-SCHEMA.md'), '---\nid: FR-BAD-SCHEMA\ntype: requirement\n---\n', 'utf-8');
    fs.writeFileSync(
      path.join(chgDir, 'proposal.md'),
      '---\nid: CHG-PATCH\ntype: proposal\nprofile: patch\n---\n# Patch\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(chgDir, 'spec.md'),
      '---\nid: CHG-PATCH\ntype: spec\nprofile: patch\ncitations:\n  - id: FR-FAIL-001\n    digest: "sha256:0000"\n---\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(chgDir, 'tasks.md'),
      '---\ntasks:\n  - id: TSK-BAD\n    title: Unverified\n    autonomyMode: INVALID_MODE\n---\n- [ ] TSK-BAD\n',
      'utf-8'
    );

    expect(auditGherkinGate(tmpDir, false).status).toBe('FAILED');
    expect(auditPdacGate(tmpDir, false).status).toBe('FAILED');
    expect(auditTraceabilityGate(tmpDir).status).toBe('FAILED');
    expect(auditGovernanceGate(tmpDir).status).toBe('FAILED');
    expect(auditTestingGate(tmpDir).status).toBe('FAILED');
    expect(auditSchemasGate(tmpDir).status).toBe('FAILED');
    expect(auditDuplicatesGate(tmpDir).status).toBe('FAILED');

    // Secrets & Privacy failures (using dynamic strings so Gate 8/11 on this spec stay clean)
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    const fakeToken = ['ghp_', '9xK2mP8qR4tV7wZ1yB5nC3jL6fH0dS2aE4gU'].join('');
    fs.writeFileSync(path.join(tmpDir, 'src', 'sec.ts'), `export const tok = "${fakeToken}";\n`, 'utf-8');
    const piiCall = ['console', '.log(user.', 'email);'].join('');
    fs.writeFileSync(path.join(tmpDir, 'src', 'pii.ts'), `export function f(user: { email: string }) { ${piiCall} }\n`, 'utf-8');

    expect(auditSecretsGate(tmpDir).status).toBe('FAILED');
    expect(auditPrivacyGate(tmpDir).status).toBe('FAILED');

    // Progressive friction failure: git repo with patch profile touching protected quality-policy.yaml
    execFileSync('git', ['init'], { cwd: tmpDir, stdio: 'ignore' });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: tmpDir, stdio: 'ignore' });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: tmpDir, stdio: 'ignore' });
    execFileSync('git', ['checkout', '-b', 'patch/chg-patch'], { cwd: tmpDir, stdio: 'ignore' });
    execFileSync('git', ['commit', '--allow-empty', '-m', 'init'], { cwd: tmpDir, stdio: 'ignore' });
    fs.writeFileSync(path.join(tmpDir, 'quality-policy.yaml'), 'enforce_mode: PERMISSIVE\n', 'utf-8');
    const fric = auditFrictionGate(tmpDir);
    expect(fric.status).toBe('FAILED');
    expect(fric.remediation).toContain('minor');

    // Sanity check canonical SHA-256 format
    expect(computeCanonicalSha256(frText)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('renderGateBadge, renderRemediations, printDashboardHeader, printDashboardFooter & renderDashboard render all states', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    expect(renderGateBadge('PASSED')).toContain('PASSED');
    expect(renderGateBadge('FIXED')).toContain('AUTO-FIX');
    expect(renderGateBadge('FAILED')).toContain('FAILED');
    expect(renderGateBadge('UNKNOWN')).toContain('FAILED');

    renderRemediations([
      { name: 'Gate A', status: 'FAILED', message: 'err', remediation: 'Do X' },
      { name: 'Gate B', status: 'FAILED', message: 'err' },
    ]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Do X'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Review affected files.'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('PRE-FLIGHT BLOCKED'));

    logSpy.mockClear();
    printDashboardHeader(false, 2, 3);
    expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).not.toContain('AUTO-FIX MODE ACTIVE');

    printDashboardHeader(true, 4, 5);
    const hdrOut = logSpy.mock.calls.map((c) => String(c[0])).join('\n').replace(/\u001b\[[0-9;]*m/g, '');
    expect(hdrOut).toContain('AUTO-FIX MODE ACTIVE');
    expect(hdrOut).toMatch(/Gherkin features synchronized:\s*4$/m);
    expect(hdrOut).toMatch(/SHA-256 digests synchronized:\s*5$/m);

    logSpy.mockClear();
    printDashboardFooter(false);
    expect(logSpy).not.toHaveBeenCalled();
    printDashboardFooter(true);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('PRE-FLIGHT PASSED (EXIT 0)'));

    const mixed: PreflightGateSummary[] = [
      { name: 'G1', status: 'PASSED', message: 'ok' },
      { name: 'G2', status: 'FIXED', message: 'fixed' },
    ];
    logSpy.mockClear();
    renderDashboard(mixed, true, 1, 1);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('EXIT 0'));
  });

  it('collectPreflightGates, emitCheckJson, executePreflightCheck & runCheck integrate end-to-end cleanly', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const noFixGates = collectPreflightGates(tmpDir, false, 2, 2, false);
    expect(noFixGates).toHaveLength(12);
    expect(noFixGates.every((g) => g.status === 'PASSED')).toBe(true);

    const fixedGates = collectPreflightGates(tmpDir, true, 1, 1, false);
    expect(fixedGates[0].status).toBe('FIXED');
    expect(fixedGates[1].status).toBe('FIXED');

    const sampleResult: PreflightCheckResult = {
      success: false,
      autoFixExecuted: true,
      gherkinSynced: 1,
      digestsSynced: 2,
      gates: [{ name: 'G1', status: 'FAILED', message: 'bad' }],
    };
    emitCheckJson(sampleResult);
    const emitted = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(emitted.command).toBe('check');
    expect(emitted.success).toBe(false);
    expect(emitted.exitCode).toBe(1);
    expect(emitted.gherkinSynced).toBe(1);
    expect(emitted.digestsSynced).toBe(2);

    logSpy.mockClear();
    const execRes = executePreflightCheck({ root: tmpDir, fix: true, vuln: false, silent: false });
    expect(execRes.success).toBe(true);
    expect(execRes.autoFixExecuted).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('PRE-FLIGHT PASSED (EXIT 0)'));

    logSpy.mockClear();
    expect(runCheck({ root: tmpDir, json: true, vuln: false })).toBe(true);
    const runJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(runJson.command).toBe('check');
    expect(runJson.success).toBe(true);
    expect(runJson.gates).toHaveLength(12);
  });

  it('detectDefaultScaffoldLanguage supports nested manifests (depth <= 3), skips artifact dirs, honors Phase 0 config, and avoids silent ts fallback (FR-068)', () => {
    // 1. Empty directory returns null and autoScaffoldMissingSteps skips without emitting .ts files
    const emptyDir = path.join(tmpDir, 'empty-proj');
    fs.mkdirSync(path.join(emptyDir, 'tests', 'features'), { recursive: true });
    fs.writeFileSync(
      path.join(emptyDir, 'tests', 'features', 'sample.feature'),
      'Feature: Sample\n  Scenario: S\n    Given a\n    Then b\n',
      'utf-8'
    );
    expect(detectDefaultScaffoldLanguage(emptyDir)).toBeNull();
    expect(autoScaffoldMissingSteps(emptyDir)).toBe(0);
    expect(fs.existsSync(path.join(emptyDir, 'tests', 'steps', 'sample.steps.ts'))).toBe(false);

    // 2. Nested manifests up to depth 3
    const nestedCases: Array<{ manifestPath: string; expected: 'cs' | 'py' | 'go' | 'rs' | 'ts' }> = [
      { manifestPath: 'src/App/App.csproj', expected: 'cs' },
      { manifestPath: 'backend/pyproject.toml', expected: 'py' },
      { manifestPath: 'services/api/go.mod', expected: 'go' },
      { manifestPath: 'crates/core/Cargo.toml', expected: 'rs' },
      { manifestPath: 'frontend/package.json', expected: 'ts' },
    ];
    for (const tc of nestedCases) {
      const caseDir = path.join(tmpDir, `nested-${tc.expected}`);
      const fullManifest = path.join(caseDir, tc.manifestPath);
      fs.mkdirSync(path.dirname(fullManifest), { recursive: true });
      fs.writeFileSync(fullManifest, '{}', 'utf-8');
      expect(detectDefaultScaffoldLanguage(caseDir)).toBe(tc.expected);
    }

    // 3. Skips dependency/build/cache directories
    const skippedDirs = [
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
    ];
    for (const skip of skippedDirs) {
      const skipRoot = path.join(tmpDir, `skip-${skip.replace('.', 'dot-')}`);
      const hiddenManifest = path.join(skipRoot, skip, 'pyproject.toml');
      fs.mkdirSync(path.dirname(hiddenManifest), { recursive: true });
      fs.writeFileSync(hiddenManifest, '[project]\nname="ignored"\n', 'utf-8');
      expect(detectDefaultScaffoldLanguage(skipRoot)).toBeNull();
    }

    // 4. Depth > 3 boundary is not detected
    const deepDir = path.join(tmpDir, 'too-deep');
    const deepManifest = path.join(deepDir, 'a', 'b', 'c', 'd', 'pyproject.toml');
    fs.mkdirSync(path.dirname(deepManifest), { recursive: true });
    fs.writeFileSync(deepManifest, '[project]\nname="deep"\n', 'utf-8');
    expect(detectDefaultScaffoldLanguage(deepDir)).toBeNull();

    // 5. Phase 0 explicit config in .aisdlc.json (testing.language & stack.language)
    const jsonTestingDir = path.join(tmpDir, 'cfg-json-testing');
    fs.mkdirSync(jsonTestingDir, { recursive: true });
    fs.writeFileSync(path.join(jsonTestingDir, '.aisdlc.json'), JSON.stringify({ testing: { language: 'cs' } }), 'utf-8');
    expect(detectDefaultScaffoldLanguage(jsonTestingDir)).toBe('cs');

    const jsonStackDir = path.join(tmpDir, 'cfg-json-stack');
    fs.mkdirSync(jsonStackDir, { recursive: true });
    fs.writeFileSync(path.join(jsonStackDir, '.aisdlc.json'), JSON.stringify({ stack: { language: 'go' } }), 'utf-8');
    expect(detectDefaultScaffoldLanguage(jsonStackDir)).toBe('go');

    // 6. Phase 0 explicit config in quality-policy.yaml (testing.language & stack.language)
    const yamlTestingDir = path.join(tmpDir, 'cfg-yaml-testing');
    fs.mkdirSync(yamlTestingDir, { recursive: true });
    fs.writeFileSync(path.join(yamlTestingDir, 'quality-policy.yaml'), 'testing:\n  language: py\n', 'utf-8');
    expect(detectDefaultScaffoldLanguage(yamlTestingDir)).toBe('py');

    const yamlStackDir = path.join(tmpDir, 'cfg-yaml-stack');
    fs.mkdirSync(yamlStackDir, { recursive: true });
    fs.writeFileSync(path.join(yamlStackDir, 'quality-policy.yaml'), 'stack:\n  language: rs\n', 'utf-8');
    expect(detectDefaultScaffoldLanguage(yamlStackDir)).toBe('rs');

    // 7. Invalid language config is rejected (returns null)
    const invalidCfgDir = path.join(tmpDir, 'cfg-invalid');
    fs.mkdirSync(invalidCfgDir, { recursive: true });
    fs.writeFileSync(path.join(invalidCfgDir, '.aisdlc.json'), JSON.stringify({ testing: { language: 'fortran' } }), 'utf-8');
    expect(detectDefaultScaffoldLanguage(invalidCfgDir)).toBeNull();
  });

  it('normalizeScaffoldLanguage, readJsonConfigLanguage, readYamlPolicyLanguage, readConfiguredScaffoldLanguage, collectManifestDirs, enqueueChildDirs, hasAnyFile, and detectLanguageInDir handle edge cases (FR-068)', () => {
    expect(normalizeScaffoldLanguage(' TS ')).toBe('ts');
    expect(normalizeScaffoldLanguage('ruby')).toBeNull();
    expect(normalizeScaffoldLanguage(123)).toBeNull();

    const malformedDir = path.join(tmpDir, 'malformed-cfg');
    fs.mkdirSync(malformedDir, { recursive: true });
    fs.writeFileSync(path.join(malformedDir, '.aisdlc.json'), '{bad json', 'utf-8');
    expect(readJsonConfigLanguage(malformedDir)).toBeNull();
    expect(readYamlPolicyLanguage(malformedDir)).toBeNull();
    expect(readConfiguredScaffoldLanguage(malformedDir)).toBeNull();

    fs.writeFileSync(path.join(malformedDir, 'quality-policy.yaml'), 'other:\n  language: py\ntesting:\n  language: go\n', 'utf-8');
    expect(readYamlPolicyLanguage(malformedDir)).toBe('go');
    expect(readConfiguredScaffoldLanguage(malformedDir)).toBe('go');

    const missingRoot = path.join(tmpDir, 'no-such-dir');
    expect(collectManifestDirs(missingRoot, 3)).toEqual([]);

    const scanDir = path.join(tmpDir, 'scan-dir');
    fs.mkdirSync(path.join(scanDir, 'sub'), { recursive: true });
    fs.mkdirSync(path.join(scanDir, 'node_modules'), { recursive: true });
    const queue: Array<{ dir: string; depth: number }> = [];
    enqueueChildDirs(scanDir, 1, queue);
    expect(queue).toEqual([{ dir: path.join(scanDir, 'sub'), depth: 1 }]);

    fs.writeFileSync(path.join(scanDir, 'tsconfig.json'), '{}', 'utf-8');
    expect(hasAnyFile(scanDir, ['tsconfig.json'])).toBe(true);
    expect(hasAnyFile(scanDir, ['Cargo.toml'])).toBe(false);
    expect(detectLanguageInDir(scanDir)).toBe('ts');
    expect(detectLanguageInDir(path.join(scanDir, 'sub'))).toBeNull();
  });
});
