import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { checkGherkinInSync, extractGherkinFeatures, scaffoldGherkinSteps } from '../src/verifiers/gherkin.js';

describe('Deterministic Gherkin & Step Scaffold Enforcement (checkGherkinInSync)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-gherkin-enforce-'));
    const productDir = path.join(tmpDir, 'specs', 'product');
    fs.mkdirSync(productDir, { recursive: true });
    fs.writeFileSync(
      path.join(productDir, 'FR-001-SAMPLE.md'),
      [
        '---',
        'id: FR-001-SAMPLE',
        'version: "1.0.0"',
        '---',
        '',
        '# FR-001-SAMPLE',
        '',
        '```gherkin',
        '@FR-001-SAMPLE @automated',
        'Feature: Sample Feature',
        '  Scenario: Nominal action',
        '    Given a valid input',
        '    When the action runs',
        '    Then it succeeds',
        '```',
        '',
      ].join('\n'),
      'utf-8'
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('passes when .feature is extracted and deterministic step file exists in tests/steps/', () => {
    extractGherkinFeatures({ rootDir: tmpDir });
    scaffoldGherkinSteps({
      rootDir: tmpDir,
      featurePath: 'tests/features/fr-001-sample.feature',
      lang: 'ts',
      allowFallback: true,
    });

    const result = checkGherkinInSync({ rootDir: tmpDir });
    expect(result.inSync).toBe(true);
    expect(result.missingFiles).toEqual([]);
    expect(result.outOfSyncFiles).toEqual([]);
    expect(result.orphanFeatureFiles).toEqual([]);
    expect(result.missingStepFiles).toEqual([]);
  });

  it('fails when .feature is extracted but deterministic step file is missing in tests/steps/', () => {
    extractGherkinFeatures({ rootDir: tmpDir });

    const result = checkGherkinInSync({ rootDir: tmpDir });
    expect(result.inSync).toBe(false);
    expect(result.missingStepFiles).toContain('tests/features/fr-001-sample.feature');
  });

  it('fails when a manual/orphan .feature file exists in tests/features/ without Markdown source', () => {
    extractGherkinFeatures({ rootDir: tmpDir });
    scaffoldGherkinSteps({
      rootDir: tmpDir,
      featurePath: 'tests/features/fr-001-sample.feature',
      lang: 'ts',
      allowFallback: true,
    });
    fs.writeFileSync(
      path.join(tmpDir, 'tests', 'features', 'manual-orphan.feature'),
      'Feature: Hand-written\n  Scenario: Manual\n    Given something\n',
      'utf-8'
    );

    const result = checkGherkinInSync({ rootDir: tmpDir });
    expect(result.inSync).toBe(false);
    expect(result.orphanFeatureFiles).toContain('tests/features/manual-orphan.feature');
  });

  it('fails when an extracted .feature file is edited manually (out-of-sync)', () => {
    extractGherkinFeatures({ rootDir: tmpDir });
    scaffoldGherkinSteps({
      rootDir: tmpDir,
      featurePath: 'tests/features/fr-001-sample.feature',
      lang: 'ts',
      allowFallback: true,
    });
    const featureFile = path.join(tmpDir, 'tests', 'features', 'fr-001-sample.feature');
    fs.appendFileSync(featureFile, '\n# manual edit\n', 'utf-8');

    const result = checkGherkinInSync({ rootDir: tmpDir });
    expect(result.inSync).toBe(false);
    expect(result.outOfSyncFiles).toContain('tests/features/fr-001-sample.feature');
  });
});
