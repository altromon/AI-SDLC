/**
 * CLI & Checkpoint 1 Tests for Per-Feature BDD Step Language Sync (RED Phase)
 * Cites: FR-070-BDD-STEP-LANGUAGE-SYNC-001, CHG-070-BDD-STEP-LANGUAGE-SYNC
 * Tag: @FR-070-BDD-STEP-LANGUAGE-SYNC-001 @CHG-070-BDD-STEP-LANGUAGE-SYNC
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { extractGherkinFeatures, scaffoldGherkinSteps } from '@aisdlc/core';
import { auditGherkinGate, autoScaffoldMissingSteps } from '../src/commands/check.js';
import { runGherkinScaffold } from '../src/commands/gherkin.js';
import { runVerifyGherkin } from '../src/commands/verify.js';

function createSyncedMarkdownFeature(rootDir: string, reqId = 'FR-070-CLI-SYNC-001'): string {
  const productDir = path.join(rootDir, 'specs', 'product');
  fs.mkdirSync(productDir, { recursive: true });
  fs.writeFileSync(
    path.join(productDir, `${reqId}.md`),
    [
      '---',
      `id: ${reqId}`,
      'version: "1.0.0"',
      '---',
      '',
      `# ${reqId}`,
      '',
      '```gherkin',
      `@${reqId} @automated`,
      `Feature: CLI Sync Feature ${reqId}`,
      '  Scenario: Nominal CLI flow',
      '    Given a synced markdown specification',
      '    When verification runs',
      '    Then parity is enforced',
      '```',
      '',
    ].join('\n'),
    'utf-8'
  );
  extractGherkinFeatures({ rootDir });
  return `tests/features/${reqId.toLowerCase()}.feature`;
}

describe('@FR-070-BDD-STEP-LANGUAGE-SYNC-001: CLI & Checkpoint 1 BDD step language sync', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-cli-bdd-lang-sync-'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('runVerifyGherkin({ featuresOnly: true, json: true }) succeeds with exitCode 0 when .feature is synced without tests/steps/*', () => {
    createSyncedMarkdownFeature(tmpDir, 'FR-070-CLI-FEAT-ONLY-001');
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((msg: unknown) => {
      logs.push(String(msg));
    });

    const ok = runVerifyGherkin({
      root: tmpDir,
      featuresOnly: true,
      json: true,
    } as Parameters<typeof runVerifyGherkin>[0] & { featuresOnly?: boolean });

    expect(ok).toBe(true);
    const payload = JSON.parse(logs.join('\n'));
    expect(payload.success).toBe(true);
    expect(payload.exitCode).toBe(0);
  });

  it('runVerifyGherkin({ json: true }) emits STEP_LANGUAGE_MISMATCH when .cs production code has .steps.ts step file', () => {
    const featureRel = createSyncedMarkdownFeature(tmpDir, 'FR-070-CLI-MISMATCH-001');
    const srcDir = path.join(tmpDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'Service.cs'), '// FR-070-CLI-MISMATCH-001\n', 'utf-8');

    scaffoldGherkinSteps({
      rootDir: tmpDir,
      featurePath: featureRel,
      lang: 'ts',
      allowFallback: true,
    });

    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((msg: unknown) => {
      logs.push(String(msg));
    });

    const ok = runVerifyGherkin({ root: tmpDir, json: true });

    expect(ok).toBe(false);
    const payload = JSON.parse(logs.join('\n'));
    expect(payload.success).toBe(false);
    expect(payload.summary?.stepLanguageMismatchCount).toBe(1);
    expect(
      Array.isArray(payload.violations) &&
        payload.violations.some((v: { code?: string; rule?: string }) => v.code === 'STEP_LANGUAGE_MISMATCH' || v.rule === 'STEP_LANGUAGE_MISMATCH')
    ).toBe(true);
  });

  it('runGherkinScaffold with omitted --lang auto-infers "cs" from associated .cs production code and generates *Steps.cs', async () => {
    const featureRel = createSyncedMarkdownFeature(tmpDir, 'FR-070-CLI-INFER-001');
    const srcDir = path.join(tmpDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'InferredService.cs'), '// FR-070-CLI-INFER-001\n', 'utf-8');

    const ok = await runGherkinScaffold(
      path.join(tmpDir, featureRel),
      {
        root: tmpDir,
        fallback: true,
        silent: true,
      } as Parameters<typeof runGherkinScaffold>[1]
    );

    expect(ok).toBe(true);
    const stepsDir = path.join(tmpDir, 'tests', 'steps');
    const generatedFiles = fs.existsSync(stepsDir) ? fs.readdirSync(stepsDir) : [];
    expect(generatedFiles.some((f) => f.endsWith('Steps.cs'))).toBe(true);
    expect(generatedFiles.some((f) => f.endsWith('.steps.ts'))).toBe(false);
  });

  it('autoScaffoldMissingSteps and auditGherkinGate handle stepLanguageMismatches and per-feature target languages', () => {
    const featureRel = createSyncedMarkdownFeature(tmpDir, 'FR-070-CLI-CHECK-001');
    const srcDir = path.join(tmpDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'CheckService.cs'), '// FR-070-CLI-CHECK-001\n', 'utf-8');

    // Seed mismatched TS step file
    scaffoldGherkinSteps({
      rootDir: tmpDir,
      featurePath: featureRel,
      lang: 'ts',
      allowFallback: true,
    });

    const failedGate = auditGherkinGate(tmpDir, false);
    expect(failedGate.status).toBe('FAILED');
    expect(failedGate.remediation).toContain('STEP_LANGUAGE_MISMATCH');

    const scaffoldedCount = autoScaffoldMissingSteps(tmpDir);
    expect(scaffoldedCount).toBeGreaterThanOrEqual(1);

    const stepsDir = path.join(tmpDir, 'tests', 'steps');
    const generatedFiles = fs.existsSync(stepsDir) ? fs.readdirSync(stepsDir) : [];
    expect(generatedFiles.some((f) => f.endsWith('Steps.cs'))).toBe(true);

    const passedGate = auditGherkinGate(tmpDir, false);
    expect(passedGate.status).toBe('PASSED');
  });

  it('scripts/verify-checkpoint-1.ts Gate 4 passes "--features-only" to verify gherkin', () => {
    const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..');
    const scriptContent = fs.readFileSync(
      path.join(repoRoot, 'scripts', 'verify-checkpoint-1.ts'),
      'utf-8'
    );
    expect(scriptContent).toContain('--features-only');
  });
});
