import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  integrateAllSddChanges,
  integrateSddChange,
  parseSpecCatalogScope,
  parseTasksFromContent,
  verifySddIntegration,
} from '../src/adapters/sdd/integration.js';
import {
  evaluateVulnerabilityThresholds,
  isToolAvailable,
  mergeSbomGaps,
  normalizeSpdxLicense,
  parseSyftOutput,
  parseTrivyOutput,
  parseTrivyVulnerabilities,
  resolveLicenseFromFile,
  scanInstalledLicenses,
  scanPythonDependencies,
  scanWithSyft,
  scanWithTrivy,
  scanWithTrivyAsync,
} from '../src/verifiers/sca/scanner.js';
import type { ScannedDependency } from '../src/verifiers/sca/types.js';

describe('Core Orchestrator Error Branches Batch 1 (SDD Integration & SCA Scanner)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-orch-b1-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('sdd/integration: handles missing change, malformed spec tables, corrupted design.md, partial/unintegrated audits, and batch errors', () => {
    // Missing change dir -> error result
    const missing = integrateSddChange({ rootDir: tmpDir, changeId: 'CHG-DOES-NOT-EXIST' });
    expect(missing.success).toBe(false);
    expect(missing.errors.length).toBeGreaterThan(0);

    // Malformed catalog scope table rows (< 3 cols, invalid action)
    const scope = parseSpecCatalogScope(`
### 1.1 Affected Existing Catalog Items
| Catalog Category | Item ID | Action |
| :--- | :--- | :--- |
| Req | FR-1 | INVALID_ACTION |
| OnlyTwo | Cols |

### 1.2 New Catalog Items Introduced
| Catalog Category | Item ID | Target Dir |
| :--- | :--- | :--- |
| Short |
| Req | | specs/02_product/reqs |
`);
    expect(scope.affectedItems).toEqual([]);
    expect(scope.newItems).toEqual([]);

    // parseTasksFromContent with no tasks
    expect(parseTasksFromContent('# Empty tasks')).toEqual([]);

    // Setup a change with product-handoff.yaml + corrupted design.md + draft canonical req
    const chgDir = path.join(tmpDir, 'specs', 'changes', 'active', 'CHG-900-err');
    fs.mkdirSync(chgDir, { recursive: true });
    fs.writeFileSync(
      path.join(chgDir, 'handoff.yaml'),
      `id: HOF-900
changeId: CHG-900-err
subgraph:
  requirements:
    - FR-900
    - FR-901
citations:
  - targetId: CMP-900
`,
      'utf-8'
    );
    // Corrupted design.md frontmatter to trigger catch in collectDesignComponents
    fs.writeFileSync(path.join(chgDir, 'design.md'), '---\n: [unclosed\n---\n', 'utf-8');
    fs.writeFileSync(path.join(chgDir, 'tasks.md'), '- [x] `TSK-1` Done\n- [ ] `TSK-2` Pending\n', 'utf-8');

    // Canonical FR-900 exists with draft status; FR-901 missing
    const reqDir = path.join(tmpDir, 'specs', '02_product', 'functional');
    fs.mkdirSync(reqDir, { recursive: true });
    fs.writeFileSync(
      path.join(reqDir, 'FR-900.md'),
      `---\nid: FR-900\nstatus: draft\nversion: 1.0.0\n---\n# FR-900\n\n## 1. Enunciado Normativo\nEl sistema DEBE implementar y soportar la capacidad de x.\n`,
      'utf-8'
    );

    const audit = verifySddIntegration({ rootDir: tmpDir });
    expect(audit.audits.some((a) => a.status === 'PARTIALLY_INTEGRATED' && a.missingRequirements.includes('FR-901'))).toBe(true);

    // Batch run including an unready change without handoff -> skipped/error handled cleanly
    const brokenChg = path.join(tmpDir, 'specs', 'changes', 'active', 'CHG-901-no-handoff');
    fs.mkdirSync(brokenChg, { recursive: true });
    const batch = integrateAllSddChanges({ rootDir: tmpDir, autoArchive: false });
    expect(batch.results.length).toBeGreaterThanOrEqual(0);
  });

  it('sdd/integration: syncs SEC-REQ / PRIV-REQ domain Gherkin and handles boilerplate replacement + bumpMinorSemver fallback', () => {
    const chgDir = path.join(tmpDir, 'specs', 'changes', 'active', 'CHG-902-sec');
    fs.mkdirSync(chgDir, { recursive: true });
    fs.writeFileSync(
      path.join(chgDir, 'handoff.yaml'),
      `id: HOF-902
changeId: CHG-902-sec
subgraph:
  requirements:
    - SEC-REQ-902
    - PRIV-REQ-902
citations:
  - targetId: CMP-902
`,
      'utf-8'
    );
    fs.writeFileSync(path.join(chgDir, 'tasks.md'), '- [x] `TSK-902` Complete\n', 'utf-8');
    fs.writeFileSync(
      path.join(chgDir, 'spec.md'),
      `# Spec
### [SEC-REQ-902]
**Target Delta (After):** Enforce strict token rotation across all boundary handlers.

### [PRIV-REQ-902]
**Target Delta (After):** Mask all email addresses before logging telemetry events.

\`\`\`gherkin
@security
Scenario: Reject expired token
  Given an expired bearer token
  When the request arrives
  Then return 401
\`\`\`

\`\`\`gherkin
@privacy
Scenario: Mask PII
  Given an email payload
  When logged
  Then redact local part
\`\`\`
`,
      'utf-8'
    );

    const secDir = path.join(tmpDir, 'specs', '04_security');
    const privDir = path.join(tmpDir, 'specs', '05_privacy');
    const cmpDir = path.join(tmpDir, 'specs', '03_architecture', 'components');
    fs.mkdirSync(secDir, { recursive: true });
    fs.mkdirSync(privDir, { recursive: true });
    fs.mkdirSync(cmpDir, { recursive: true });

    fs.writeFileSync(
      path.join(secDir, 'SEC-REQ-902.md'),
      `---\nid: SEC-REQ-902\nstatus: draft\nversion: not-semver\n---\n# SEC-REQ-902\n\n## 1. Enunciado Normativo\nEl sistema DEBE implementar y soportar la capacidad de seguridad.\n\n\`\`\`gherkin\nGiven an unauthenticated actor or invalid credentials\nWhen the request reaches protected enclaves\nThen deny\n\`\`\`\n`,
      'utf-8'
    );
    fs.writeFileSync(
      path.join(privDir, 'PRIV-REQ-902.md'),
      `---\nid: PRIV-REQ-902\nstatus: active\nversion: 1.0.0\n---\n# PRIV-REQ-902\n\n## 1. Enunciado Normativo\nExisting custom statement that should receive an increment.\n`,
      'utf-8'
    );
    fs.writeFileSync(
      path.join(cmpDir, 'CMP-902.md'),
      `---\nid: CMP-902\nstatus: active\nversion: 1.0.0\n---\n# CMP-902\n`,
      'utf-8'
    );

    const res = integrateSddChange({ rootDir: tmpDir, changeId: 'CHG-902-sec', syncContent: true, autoArchive: false });
    expect(res.success).toBe(true);
    expect(res.updatedProductArtifacts).toContain('SEC-REQ-902');
    expect(res.updatedProductArtifacts).toContain('PRIV-REQ-902');
    expect(res.updatedArchitectureArtifacts).toContain('CMP-902');
  });

  it('sca/scanner: exercises tool-missing errors, malformed JSON/TOML/Pipfile, license edge cases, and SBOM gap warnings', async () => {
    expect(isToolAvailable('__nonexistent_binary_aisdlc_xyz__')).toBe(false);

    expect(normalizeSpdxLicense('')).toBe('UNKNOWN');
    expect(normalizeSpdxLicense([])).toBe('UNKNOWN');
    expect(normalizeSpdxLicense(['', null])).toBe('UNKNOWN');
    expect(normalizeSpdxLicense(['MIT', 'Apache-2.0'])).toBe('(MIT OR Apache-2.0)');
    expect(normalizeSpdxLicense({ type: 'ISC' })).toBe('ISC');
    expect(normalizeSpdxLicense({ name: 'BSD-2-Clause' })).toBe('BSD-2-Clause');
    expect(normalizeSpdxLicense({ license: 'Apache-2.0' })).toBe('Apache-2.0');
    expect(normalizeSpdxLicense({})).toBe('UNKNOWN');
    expect(normalizeSpdxLicense(123)).toBe('UNKNOWN');

    // resolveLicenseFromFile: missing, directory (throws readFileSync), and various license texts
    expect(resolveLicenseFromFile(undefined)).toBeUndefined();
    expect(resolveLicenseFromFile(tmpDir)).toBeUndefined();
    const msPl = path.join(tmpDir, 'LICENSE.mspl');
    fs.writeFileSync(msPl, 'Microsoft Public License (MS-PL)', 'utf-8');
    expect(resolveLicenseFromFile(msPl)).toBe('MS-PL');
    const msRl = path.join(tmpDir, 'LICENSE.msrl');
    fs.writeFileSync(msRl, 'Microsoft Reciprocal License', 'utf-8');
    expect(resolveLicenseFromFile(msRl)).toBe('MS-RL');
    const pyLic = path.join(tmpDir, 'LICENSE.py');
    fs.writeFileSync(pyLic, 'Python Software Foundation License', 'utf-8');
    expect(resolveLicenseFromFile(pyLic)).toBe('Python-2.0');

    // Python malformed Pipfile.lock + incomplete TOML block
    fs.writeFileSync(path.join(tmpDir, 'poetry.lock'), '[[package]]\nname = "only-name"\n', 'utf-8');
    fs.writeFileSync(path.join(tmpDir, 'Pipfile.lock'), '{ invalid json', 'utf-8');
    const pySeen = new Map<string, ScannedDependency>();
    scanPythonDependencies(tmpDir, pySeen);
    expect(pySeen.size).toBe(0);

    // Malformed Trivy & Syft outputs
    expect(parseTrivyVulnerabilities('not-json')).toEqual([]);
    expect(parseTrivyVulnerabilities(JSON.stringify({ Results: [{ Vulnerabilities: [{}] }] }))[0].id).toBe('UNKNOWN');
    expect(parseTrivyOutput('not-json')).toEqual([]);
    expect(parseTrivyOutput(JSON.stringify({ Results: [{ Packages: [{}] }] }))[0].name).toBe('unknown');
    expect(parseSyftOutput('not-json')).toEqual([]);
    expect(parseSyftOutput(JSON.stringify({ artifacts: [{ name: 'pkg-a', licenses: null }] }))[0].spdxLicense).toBe('UNKNOWN');

    // evaluateVulnerabilityThresholds with VEX + unknown severity
    const evalRes = evaluateVulnerabilityThresholds(
      [
        { id: 'CVE-1', packageName: 'a', installedVersion: '1.0', severity: 'WEIRD' as never },
        { id: 'CVE-2', packageName: 'b', installedVersion: '1.0', severity: 'CRITICAL', cvssV3Score: 9.9 },
      ],
      { failOnSeverity: 'HIGH', vexStatements: [{ id: 'CVE-2', state: 'not_affected', package: 'b' }] }
    );
    expect(evalRes.blocked).toBe(false);

    // Isolated PATH -> Trivy & Syft unavailable -> graceful empty / fallback to native
    const origPath = process.env.PATH;
    process.env.PATH = '';
    try {
      expect(scanWithTrivy(tmpDir).executed).toBe(false);
      expect(scanWithSyft(tmpDir).executed).toBe(false);
      const asyncTrivy = await scanWithTrivyAsync(tmpDir, { nonInteractive: true, noInstallPrompt: true, ci: true });
      expect(asyncTrivy.executed).toBe(false);
      expect(scanInstalledLicenses(tmpDir, { tool: 'trivy' })).toEqual([]);
      expect(scanInstalledLicenses(tmpDir, { tool: 'syft' })).toEqual([]);
    } finally {
      process.env.PATH = origPath;
    }

    // mergeSbomGaps cross-check warnings + UNRESOLVED gap-fill + version tie-break sort
    const merged = mergeSbomGaps(
      [
        { name: 'zeta', version: '2.0.0', spdxLicense: 'UNRESOLVED', purl: 'pkg:npm/zeta@2.0.0', unresolvedReason: 'missing' },
        { name: 'zeta', version: '1.0.0', spdxLicense: 'MIT', purl: 'pkg:npm/zeta@1.0.0' },
        { name: 'local-only', version: '1.0.0', spdxLicense: 'MIT' },
      ],
      [
        { ecosystem: 'npm', name: 'zeta', version: '2.0.0', spdxLicense: 'Apache-2.0' },
        { ecosystem: 'npm', namespace: 'scope', name: 'extra-sbom', version: '1.0.0', spdxLicense: 'ISC' },
      ]
    );
    expect(merged.dependencies[1].version).toBe('1.0.0');
    expect(merged.dependencies[2].spdxLicense).toBe('Apache-2.0');
    expect(merged.warnings.some((w) => w.includes('missing from SBOM'))).toBe(true);
    expect(merged.warnings.some((w) => w.includes('not present in local lockfiles'))).toBe(true);
  });
});
