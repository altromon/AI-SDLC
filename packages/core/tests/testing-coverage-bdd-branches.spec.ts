import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  verifyBddReportAttestation,
  writeCucumberJsonReport,
} from '../src/verifiers/bdd-runner.js';
import {
  parseGenericDoc,
  verifyTestingCoverage,
} from '../src/verifiers/testing-coverage.js';

describe('Testing Coverage & BDD Runner Composite Branch Paths (Happy / Sad / Boundary / Malformed)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-inc16-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('parseGenericDoc: handles missing frontmatter, malformed YAML, array root, string verified-by-tests, and numeric task id', () => {
    expect(parseGenericDoc('# Plain markdown').frontmatter).toEqual({});
    expect(parseGenericDoc('---\ninvalid: [yaml\n---\nBody').frontmatter).toEqual({});
    expect(parseGenericDoc('---\n- item1\n- item2\n---\nBody').frontmatter).toEqual({});

    const doc = parseGenericDoc(`---
id: UC-001
verified-by-tests: tests/uc001.spec.ts
tasks:
  - id: 42
    title: Numeric id task
    verification:
      method: unit
      command-or-criteria: pnpm test
---
Body`);
    expect(doc.frontmatter['verified-by-tests']).toEqual(['tests/uc001.spec.ts']);
    expect(doc.frontmatter.tasks?.[0]).toMatchObject({
      id: '42',
      title: 'Numeric id task',
      verification: { method: 'unit', criteria: 'pnpm test' },
    });
  });

  it('verifyTestingCoverage: exercises cucumber report missing, malformed JSON, non-array JSON, empty steps, failed step, and attestation enforcement', () => {
    const missingEnforced = verifyTestingCoverage({
      rootDir: tmpDir,
      enforceCucumberExecution: true,
    });
    expect(missingEnforced.cucumberExecution?.passed).toBe(false);

    const repDir = path.join(tmpDir, 'reports');
    fs.mkdirSync(repDir, { recursive: true });
    const repPath = path.join(repDir, 'cucumber-report.json');

    // Malformed JSON
    fs.writeFileSync(repPath, '{not-json', 'utf-8');
    expect(verifyTestingCoverage({ rootDir: tmpDir, cucumberReportPath: 'reports/cucumber-report.json' }).cucumberExecution).toBeUndefined();

    // Non-array JSON
    fs.writeFileSync(repPath, '{"not":"array"}', 'utf-8');
    expect(verifyTestingCoverage({ rootDir: tmpDir, cucumberReportPath: repPath }).cucumberExecution).toBeUndefined();

    // Empty steps & failed step
    fs.writeFileSync(
      repPath,
      JSON.stringify([
        {
          name: 'Feat',
          elements: [
            { name: 'EmptySteps', steps: [] },
            { name: 'FailedStep', steps: [{ result: { status: 'failed' } }] },
          ],
        },
      ]),
      'utf-8'
    );
    const execRes = verifyTestingCoverage({
      rootDir: tmpDir,
      cucumberReportPath: repPath,
      enforceBddAttestation: true,
    });
    expect(execRes.cucumberExecution?.passed).toBe(false);
    expect(execRes.cucumberExecution?.failedScenarios).toBe(2);
    expect(execRes.cucumberExecution?.attestationValid).toBe(false);
  });

  it('verifyBddReportAttestation & writeCucumberJsonReport: detects missing file, malformed JSON, missing feature on disk, feature drift, and tampered digest/signature', () => {
    expect(verifyBddReportAttestation(path.join(tmpDir, 'missing.json'), tmpDir).valid).toBe(false);

    const featDir = path.join(tmpDir, 'specs', 'features');
    fs.mkdirSync(featDir, { recursive: true });
    const featPath = path.join(featDir, 'sample.feature');
    fs.writeFileSync(featPath, 'Feature: Sample\n  Scenario: S1\n    Given a\n    Then b\n', 'utf-8');

    const reportPath = path.join(tmpDir, 'reports', 'cucumber.json');
    writeCucumberJsonReport(
      [
        {
          uri: 'specs/features/sample.feature',
          name: 'Sample',
          tags: ['@FR-1'],
          scenarios: [
            {
              name: 'S1',
              tags: [],
              status: 'passed',
              durationMs: 5,
              steps: [{ keyword: 'Given', text: 'a', status: 'passed', durationMs: 5 }],
            },
          ],
        },
      ],
      reportPath,
      { rootDir: tmpDir }
    );

    const validAtt = verifyBddReportAttestation(reportPath, tmpDir, { requireAttestation: true });
    expect(validAtt.valid).toBe(true);

    // Tamper feature file on disk -> SHA-256 drift
    fs.writeFileSync(featPath, 'Feature: Tampered\n', 'utf-8');
    const driftAtt = verifyBddReportAttestation(reportPath, tmpDir, { requireAttestation: true });
    expect(driftAtt.valid).toBe(false);
    expect(driftAtt.errors.some((e) => e.includes('drift'))).toBe(true);

    // Delete feature file -> missing on disk
    fs.rmSync(featPath);
    const missingFeatAtt = verifyBddReportAttestation(reportPath, tmpDir, { requireAttestation: true });
    expect(missingFeatAtt.valid).toBe(false);
    expect(missingFeatAtt.errors.some((e) => e.includes('missing on disk'))).toBe(true);

    // Tamper report digest/signature
    const rawArr = JSON.parse(fs.readFileSync(reportPath, 'utf-8')) as Array<Record<string, unknown>>;
    const att = rawArr[0].attestation as Record<string, unknown>;
    att.reportDigestSha256 = '0'.repeat(64);
    att.signatureSha256 = 'f'.repeat(64);
    fs.writeFileSync(reportPath, JSON.stringify(rawArr), 'utf-8');
    const tamperedAtt = verifyBddReportAttestation(reportPath, tmpDir, { requireAttestation: true });
    expect(tamperedAtt.valid).toBe(false);
    expect(tamperedAtt.errors.some((e) => e.includes('digest mismatch'))).toBe(true);
    expect(tamperedAtt.errors.some((e) => e.includes('signature mismatch'))).toBe(true);

    // Malformed report JSON
    fs.writeFileSync(reportPath, '{bad-json', 'utf-8');
    expect(verifyBddReportAttestation(reportPath, tmpDir).valid).toBe(false);
  });
});
