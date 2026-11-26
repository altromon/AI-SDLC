/**
 * Direct Unit Tests for Per-Feature BDD Step Language Resolver & Helpers
 * Cites: FR-070-BDD-STEP-LANGUAGE-SYNC-001, DSG-CHG-070-BDD-STEP-LANGUAGE-SYNC, GherkinStepLanguageMismatch
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { GherkinStepLanguageMismatch } from '../../packages/core/src/types/index.js';
import {
  appendYamlListItem,
  escapeRegExp,
  extractFeatureIds,
  extractYamlBlock,
  fileMatchesFeature,
  loadChangeSpecs,
  metaMatchesIds,
  parseChangeSpecMetadata,
  resolveChangeAssociations,
  resolveFeatureTargetLanguages,
  safeLstat,
  stripQuotes,
  walkProductionSourceFiles,
} from '../../packages/core/src/verifiers/gherkin-language-resolver.js';
import {
  checkFeatureStepLanguageParity,
  extractGherkinFeatures,
  getPresentStepLanguages,
  scaffoldGherkinSteps,
  SyncCheckState,
} from '../../packages/core/src/verifiers/gherkin.js';
import {
  scaffoldLanguageMismatches,
  scaffoldMissingStepFiles,
} from '../../packages/cli/src/commands/check.js';
import { resolveScaffoldLang } from '../../packages/cli/src/commands/gherkin.js';
import {
  mapLanguageMismatchViolation,
  printLanguageMismatchList,
} from '../../packages/cli/src/commands/verify.js';

describe('@FR-070-BDD-STEP-LANGUAGE-SYNC-001: gherkin-language-resolver & CLI helper unit tests', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-unit-lang-res-'));
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('escapeRegExp, stripQuotes, extractYamlBlock, and extractFeatureIds handle nominal and edge inputs', () => {
    expect(escapeRegExp('a.b+c?')).toBe('a\\.b\\+c\\?');
    expect(stripQuotes('"hello"')).toBe('hello');
    expect(stripQuotes("'world'")).toBe('world');
    expect(stripQuotes('plain')).toBe('plain');

    expect(extractYamlBlock('---\nid: FR-1\n---\nbody')).toBe('id: FR-1');
    expect(extractYamlBlock('no frontmatter')).toBe('');

    const ids = extractFeatureIds(
      '# ID Requerimiento: FR-070-UNIT-001\n@UC-070-A @automated @regression\nFeature: X'
    );
    expect(Array.from(ids).sort()).toEqual(['FR-070-UNIT-001', 'UC-070-A']);
  });

  it('appendYamlListItem, parseChangeSpecMetadata, metaMatchesIds, loadChangeSpecs, and resolveChangeAssociations resolve contracts', () => {
    const meta = parseChangeSpecMetadata(
      [
        '---',
        'id: DSG-070-U',
        'change-id: CHG-070-U',
        'contracts:',
        '  - TargetContract',
        '  - ab',
        'citations:',
        '  - id: FR-070-U-001',
        'tasks:',
        '  - id: TSK-070-U1',
        '---',
      ].join('\n')
    );
    expect(meta.ids).toEqual(['DSG-070-U', 'CHG-070-U', 'TSK-070-U1']);
    expect(meta.referencedIds).toEqual(['FR-070-U-001']);
    expect(meta.contracts).toEqual(['TargetContract']);

    appendYamlListItem('satisfies-requirements', '  - FR-999', 'FR-999', meta);
    expect(meta.referencedIds).toContain('FR-999');
    expect(metaMatchesIds(meta, new Set(['FR-070-U-001']))).toBe(true);
    expect(metaMatchesIds(meta, new Set(['UNRELATED']))).toBe(false);

    expect(loadChangeSpecs(path.join(tmpDir, 'missing'))).toEqual([]);
    const chgDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-070-u');
    fs.mkdirSync(chgDir, { recursive: true });
    fs.writeFileSync(
      path.join(chgDir, 'design.md'),
      '---\nid: DSG-1\nchange-id: CHG-1\ncontracts:\n  - MyContract\ncitations:\n  - id: FR-1\n---\n',
      'utf-8'
    );
    const assoc = resolveChangeAssociations(tmpDir, new Set(['FR-1']));
    expect(assoc.associatedIds.has('CHG-1')).toBe(true);
    expect(assoc.contractSymbols.has('MyContract')).toBe(true);
  });

  it('safeLstat, walkProductionSourceFiles, fileMatchesFeature, and resolveFeatureTargetLanguages work end-to-end', () => {
    expect(safeLstat(path.join(tmpDir, 'nope'))).toBeNull();

    const srcDir = path.join(tmpDir, 'src');
    const testsDir = path.join(tmpDir, 'tests');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.mkdirSync(testsDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'app.py'), '# FR-070-PY-001\n', 'utf-8');
    fs.writeFileSync(path.join(testsDir, 'ignored.ts'), '// FR-070-PY-001\n', 'utf-8');

    const walked = walkProductionSourceFiles(tmpDir);
    expect(walked.some((f) => f.endsWith('app.py'))).toBe(true);
    expect(walked.some((f) => f.endsWith('ignored.ts'))).toBe(false);

    expect(fileMatchesFeature('hello MyContract', [], [/\bMyContract\b/])).toBe(true);
    expect(fileMatchesFeature('hello MyContractHelper', [], [/\bMyContract\b/])).toBe(false);

    const featPath = path.join(tmpDir, 'tests', 'features', 'fr-070-py-001.feature');
    fs.mkdirSync(path.dirname(featPath), { recursive: true });
    fs.writeFileSync(featPath, '@FR-070-PY-001\nFeature: Py\n', 'utf-8');
    expect(resolveFeatureTargetLanguages(tmpDir, featPath)).toEqual(['py']);
  });

  it('getPresentStepLanguages, checkFeatureStepLanguageParity, and GherkinStepLanguageMismatch enforce parity', () => {
    const productDir = path.join(tmpDir, 'specs', 'product');
    fs.mkdirSync(productDir, { recursive: true });
    fs.writeFileSync(
      path.join(productDir, 'FR-070-PAR.md'),
      '---\nid: FR-070-PAR\n---\n```gherkin\n@FR-070-PAR\nFeature: Par\n  Scenario: S\n    Given a\n    When b\n    Then c\n```\n',
      'utf-8'
    );
    extractGherkinFeatures({ rootDir: tmpDir });
    const featRel = 'tests/features/fr-070-par.feature';
    const featFull = path.join(tmpDir, featRel);

    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'Svc.cs'), '// FR-070-PAR\n', 'utf-8');
    scaffoldGherkinSteps({ rootDir: tmpDir, featurePath: featRel, lang: 'ts', allowFallback: true });

    expect(getPresentStepLanguages(tmpDir, featFull)).toEqual(['ts']);

    const state: SyncCheckState = {
      outOfSyncFiles: [],
      missingFiles: [],
      missingStepFiles: [],
      stepLanguageMismatches: [],
      expectedRelPaths: new Set(),
      totalFeatures: 1,
      featuresOnly: false,
    };
    checkFeatureStepLanguageParity(tmpDir, featFull, featRel, state);
    expect(state.stepLanguageMismatches).toHaveLength(1);

    const mismatch: GherkinStepLanguageMismatch = state.stepLanguageMismatches[0];
    expect(mismatch.missingLanguages).toEqual(['cs']);

    const violation = mapLanguageMismatchViolation(mismatch);
    expect(violation.code).toBe('STEP_LANGUAGE_MISMATCH');
    printLanguageMismatchList([mismatch]);

    expect(resolveScaffoldLang(tmpDir, featRel)).toEqual(['cs']);
    expect(resolveScaffoldLang(tmpDir, featRel, 'py')).toBe('py');

    expect(scaffoldLanguageMismatches(tmpDir, [mismatch])).toBe(1);
    expect(scaffoldMissingStepFiles(tmpDir, [], 'ts')).toBe(0);
  });
});
