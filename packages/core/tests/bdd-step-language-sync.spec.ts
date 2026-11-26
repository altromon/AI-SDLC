/**
 * Core Tests for Per-Feature BDD Step Language Sync (RED Phase)
 * Cites: FR-070-BDD-STEP-LANGUAGE-SYNC-001, CHG-070-BDD-STEP-LANGUAGE-SYNC
 * Tag: @FR-070-BDD-STEP-LANGUAGE-SYNC-001 @CHG-070-BDD-STEP-LANGUAGE-SYNC
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as coreIndex from '../src/index.js';
import * as gherkinVerifier from '../src/verifiers/gherkin.js';

type ResolveFeatureTargetLanguagesFn = (rootDir: string, featurePath: string) => string[];

function getResolveFeatureTargetLanguages(): ResolveFeatureTargetLanguagesFn {
  const fromGherkin = (gherkinVerifier as Record<string, unknown>).resolveFeatureTargetLanguages;
  const fromIndex = (coreIndex as Record<string, unknown>).resolveFeatureTargetLanguages;
  expect(
    fromGherkin,
    'resolveFeatureTargetLanguages must be exported from packages/core/src/verifiers/gherkin.ts'
  ).toBeTypeOf('function');
  expect(
    fromIndex,
    'resolveFeatureTargetLanguages must be re-exported from packages/core/src/index.ts'
  ).toBeTypeOf('function');
  return fromGherkin as ResolveFeatureTargetLanguagesFn;
}

function writeFeatureSpec(rootDir: string, reqId = 'FR-070-SAMPLE-001', extraTags = ''): string {
  const productDir = path.join(rootDir, 'specs', 'product');
  fs.mkdirSync(productDir, { recursive: true });
  const tagLine = [`@${reqId}`, '@automated', '@regression', '@security', extraTags]
    .filter(Boolean)
    .join(' ');
  const mdPath = path.join(productDir, `${reqId}.md`);
  fs.writeFileSync(
    mdPath,
    [
      '---',
      `id: ${reqId}`,
      'version: "1.0.0"',
      '---',
      '',
      `# ${reqId}`,
      '',
      '```gherkin',
      tagLine,
      `Feature: Sample Feature for ${reqId}`,
      '  Scenario: Nominal action',
      '    Given a valid input',
      '    When the action executes',
      '    Then the expected result is produced',
      '```',
      '',
    ].join('\n'),
    'utf-8'
  );
  return mdPath;
}

describe('@FR-070-BDD-STEP-LANGUAGE-SYNC-001: resolveFeatureTargetLanguages & checkGherkinInSync', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-bdd-lang-sync-'));
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it.each([
    { ext: '.cs', expected: 'cs', dir: 'src/Domain', file: 'OrderService.cs' },
    { ext: '.py', expected: 'py', dir: 'src/domain', file: 'order_service.py' },
    { ext: '.go', expected: 'go', dir: 'internal/domain', file: 'order_service.go' },
    { ext: '.rs', expected: 'rs', dir: 'src/domain', file: 'order_service.rs' },
    { ext: '.ts', expected: 'ts', dir: 'src/domain', file: 'order-service.ts' },
    { ext: '.tsx', expected: 'ts', dir: 'src/ui', file: 'OrderView.tsx' },
    { ext: '.js', expected: 'ts', dir: 'src/domain', file: 'order-service.js' },
    { ext: '.jsx', expected: 'ts', dir: 'src/ui', file: 'OrderView.jsx' },
    { ext: '.mjs', expected: 'ts', dir: 'src/domain', file: 'order-service.mjs' },
    { ext: '.cjs', expected: 'ts', dir: 'src/domain', file: 'order-service.cjs' },
  ])(
    'infers "$expected" from production file "$file" ($ext) citing the requirement ID',
    ({ expected, dir, file }) => {
      const resolveFeatureTargetLanguages = getResolveFeatureTargetLanguages();
      writeFeatureSpec(tmpDir, 'FR-070-SAMPLE-001');
      gherkinVerifier.extractGherkinFeatures({ rootDir: tmpDir });

      const prodDir = path.join(tmpDir, dir);
      fs.mkdirSync(prodDir, { recursive: true });
      fs.writeFileSync(
        path.join(prodDir, file),
        `// Implements FR-070-SAMPLE-001\nexport const ok = true;\n`,
        'utf-8'
      );

      const featureRel = 'tests/features/fr-070-sample-001.feature';
      const langs = resolveFeatureTargetLanguages(tmpDir, featureRel);
      expect(langs).toEqual([expected]);
    }
  );

  it('infers target language from design.md contracts symbols with word boundaries and CHG/TSK citations', () => {
    const resolveFeatureTargetLanguages = getResolveFeatureTargetLanguages();
    writeFeatureSpec(tmpDir, 'FR-070-CONTRACT-001');
    gherkinVerifier.extractGherkinFeatures({ rootDir: tmpDir });

    const changeDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-070-contract');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(
      path.join(changeDir, 'design.md'),
      [
        '---',
        'id: DSG-CHG-070-CONTRACT',
        'type: spec-design',
        'change-id: CHG-070-CONTRACT',
        'contracts:',
        '  - InvoiceCalculator',
        '  - idx', // < 4 chars should not cause noisy matches
        'citations:',
        '  - id: FR-070-CONTRACT-001',
        '    digest: sha256:0000',
        '---',
        '# Design',
      ].join('\n'),
      'utf-8'
    );

    const srcDir = path.join(tmpDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    // Partial word match in TS should NOT match \bInvoiceCalculator\b
    fs.writeFileSync(
      path.join(srcDir, 'unrelated.ts'),
      'export class InvoiceCalculatorHelper { idx = 1; }\n',
      'utf-8'
    );
    // Exact contract symbol match in C# SHOULD match
    fs.writeFileSync(
      path.join(srcDir, 'InvoiceCalculator.cs'),
      'public class InvoiceCalculator {}\n',
      'utf-8'
    );

    const langs = resolveFeatureTargetLanguages(tmpDir, 'tests/features/fr-070-contract-001.feature');
    expect(langs).toEqual(['cs']);
  });

  it('ignores excluded directories, symlinks, and generic @automated/@regression/@security tags', () => {
    const resolveFeatureTargetLanguages = getResolveFeatureTargetLanguages();
    writeFeatureSpec(tmpDir, 'FR-070-EXCLUSIONS-001');
    gherkinVerifier.extractGherkinFeatures({ rootDir: tmpDir });

    const excludedDirs = [
      'tests',
      'node_modules',
      '.git',
      'bin',
      'obj',
      'dist',
      'build',
      'target',
      '.venv',
      'venv',
      'templates',
      'reports',
    ];
    for (const dir of excludedDirs) {
      const full = path.join(tmpDir, dir);
      fs.mkdirSync(full, { recursive: true });
      fs.writeFileSync(path.join(full, 'ignored.py'), '# FR-070-EXCLUSIONS-001\n', 'utf-8');
    }

    // Production file only mentioning generic tags must NOT match
    const srcDir = path.join(tmpDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(
      path.join(srcDir, 'generic_only.go'),
      '// @automated @regression @security\npackage main\n',
      'utf-8'
    );

    // Symlinked file referencing the requirement ID should be skipped
    const externalDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-ext-symlink-'));
    try {
      const extFile = path.join(externalDir, 'linked.rs');
      fs.writeFileSync(extFile, '// FR-070-EXCLUSIONS-001\n', 'utf-8');
      try {
        fs.symlinkSync(extFile, path.join(srcDir, 'linked.rs'));
      } catch {
        // Ignore symlink permission errors on unprivileged Windows environments
      }

      const langs = resolveFeatureTargetLanguages(tmpDir, 'tests/features/fr-070-exclusions-001.feature');
      expect(langs).toEqual([]);
    } finally {
      fs.rmSync(externalDir, { recursive: true, force: true });
    }
  });

  it('returns multiple languages for polyglot features and [] for unimplemented or missing features', () => {
    const resolveFeatureTargetLanguages = getResolveFeatureTargetLanguages();
    writeFeatureSpec(tmpDir, 'FR-070-POLYGLOT-001');
    writeFeatureSpec(tmpDir, 'FR-070-PHASE0-001');
    gherkinVerifier.extractGherkinFeatures({ rootDir: tmpDir });

    const srcDir = path.join(tmpDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'Backend.cs'), '// FR-070-POLYGLOT-001\n', 'utf-8');
    fs.writeFileSync(path.join(srcDir, 'frontend.ts'), '// FR-070-POLYGLOT-001\n', 'utf-8');

    expect(
      resolveFeatureTargetLanguages(tmpDir, 'tests/features/fr-070-polyglot-001.feature').sort()
    ).toEqual(['cs', 'ts']);
    expect(resolveFeatureTargetLanguages(tmpDir, 'tests/features/fr-070-phase0-001.feature')).toEqual([]);
    expect(resolveFeatureTargetLanguages(tmpDir, 'tests/features/does-not-exist.feature')).toEqual([]);
  });

  it('checkGherkinInSync({ featuresOnly: true }) passes when .feature matches Markdown with zero tests/steps/* files', () => {
    writeFeatureSpec(tmpDir, 'FR-070-PHASE0-SYNC-001');
    gherkinVerifier.extractGherkinFeatures({ rootDir: tmpDir });

    const result = gherkinVerifier.checkGherkinInSync({
      rootDir: tmpDir,
      featuresOnly: true,
    } as gherkinVerifier.GherkinExtractionOptions & { featuresOnly: boolean });

    expect(result.inSync).toBe(true);
    expect(result.missingFiles).toEqual([]);
    expect(result.outOfSyncFiles).toEqual([]);
    expect(result.orphanFeatureFiles).toEqual([]);
  });

  it('checkGherkinInSync({ featuresOnly: false }) fails with stepLanguageMismatches when .cs prod code has .steps.ts and passes when *Steps.cs exists', () => {
    writeFeatureSpec(tmpDir, 'FR-070-CS-PARITY-001');
    gherkinVerifier.extractGherkinFeatures({ rootDir: tmpDir });

    const srcDir = path.join(tmpDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'Billing.cs'), '// FR-070-CS-PARITY-001\n', 'utf-8');

    // Wrong language step file (.steps.ts instead of *Steps.cs)
    gherkinVerifier.scaffoldGherkinSteps({
      rootDir: tmpDir,
      featurePath: 'tests/features/fr-070-cs-parity-001.feature',
      lang: 'ts',
      allowFallback: true,
    });

    const mismatchResult = gherkinVerifier.checkGherkinInSync({ rootDir: tmpDir }) as unknown as {
      inSync: boolean;
      stepLanguageMismatches?: Array<{
        featureFile: string;
        expectedLanguages: string[];
        foundLanguages: string[];
        missingLanguages: string[];
      }>;
    };

    expect(mismatchResult.inSync).toBe(false);
    expect(mismatchResult.stepLanguageMismatches).toBeDefined();
    expect(mismatchResult.stepLanguageMismatches?.length).toBe(1);
    expect(mismatchResult.stepLanguageMismatches?.[0]).toMatchObject({
      featureFile: 'tests/features/fr-070-cs-parity-001.feature',
      expectedLanguages: ['cs'],
      foundLanguages: ['ts'],
      missingLanguages: ['cs'],
    });

    // Now scaffold C# step file -> should pass
    gherkinVerifier.scaffoldGherkinSteps({
      rootDir: tmpDir,
      featurePath: 'tests/features/fr-070-cs-parity-001.feature',
      lang: 'cs',
      allowFallback: true,
    });

    const syncedResult = gherkinVerifier.checkGherkinInSync({ rootDir: tmpDir }) as unknown as {
      inSync: boolean;
      stepLanguageMismatches?: unknown[];
    };
    expect(syncedResult.inSync).toBe(true);
    expect(syncedResult.stepLanguageMismatches ?? []).toEqual([]);
  });

  it('checkGherkinInSync reports missing language in stepLanguageMismatches for polyglot features', () => {
    writeFeatureSpec(tmpDir, 'FR-070-POLY-PARITY-001');
    gherkinVerifier.extractGherkinFeatures({ rootDir: tmpDir });

    const srcDir = path.join(tmpDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'Api.cs'), '// FR-070-POLY-PARITY-001\n', 'utf-8');
    fs.writeFileSync(path.join(srcDir, 'web.ts'), '// FR-070-POLY-PARITY-001\n', 'utf-8');

    // Only scaffold TS, missing CS
    gherkinVerifier.scaffoldGherkinSteps({
      rootDir: tmpDir,
      featurePath: 'tests/features/fr-070-poly-parity-001.feature',
      lang: 'ts',
      allowFallback: true,
    });

    const partialResult = gherkinVerifier.checkGherkinInSync({ rootDir: tmpDir }) as unknown as {
      inSync: boolean;
      stepLanguageMismatches?: Array<{
        featureFile: string;
        expectedLanguages: string[];
        foundLanguages: string[];
        missingLanguages: string[];
      }>;
    };

    expect(partialResult.inSync).toBe(false);
    expect(partialResult.stepLanguageMismatches?.[0]).toMatchObject({
      featureFile: 'tests/features/fr-070-poly-parity-001.feature',
      missingLanguages: ['cs'],
    });
    expect(partialResult.stepLanguageMismatches?.[0].expectedLanguages.sort()).toEqual(['cs', 'ts']);
    expect(partialResult.stepLanguageMismatches?.[0].foundLanguages).toContain('ts');
  });
});
