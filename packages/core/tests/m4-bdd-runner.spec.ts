/**
 * AI-SDLC: Direct Unit Tests for BDD Runner & Attestation Helpers
 * Cites: FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001, FR-044-REPRODUCIBILITY-CANONICAL-ORDERING-001, FR-063-UI-E2E-MODALITY-GATE-001
 * Tag: @FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001 @FR-044-REPRODUCIBILITY-CANONICAL-ORDERING-001 @FR-063-UI-E2E-MODALITY-GATE-001
 */

import { execFileSync } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type {
  BddAttestationRecord,
  BddFeatureExecutionReport,
  BddStepExecution,
} from '../src/types/index.js';
import {
  BddStepRegistry,
  appendParsedStep,
  attachExampleRow,
  attachStepTableRow,
  buildBaseCucumberFeature,
  computeAttestationSignature,
  computeLfSha256,
  createInitialParseState,
  executeScenarioSteps,
  executeSingleStep,
  expandScenarioOutlines,
  handleScenarioOrStepLine,
  handleStructuralHeaderLine,
  interpolatePlaceholders,
  loadCucumberReportArray,
  mapFeatureToCucumberJson,
  mapStepToCucumberJson,
  matchStepDefinition,
  parseFeatureDocument,
  parseTableRowCells,
  processFeatureLine,
  resolveCurrentGitCommit,
  resolveFeatureHashForReport,
  runAllExpandedScenarios,
  startScenarioBlock,
  verifyAttestationEntry,
  verifyBddReportAttestation,
  verifyCommitBinding,
  verifyFeatureDiskSha256,
  verifyReportDigestAndSig,
  verifySingleFeatureAttestation,
  type FeatureParseState,
  type ParsedFeatureDocument,
  type ParsedScenarioBlock,
  type ParsedStepItem,
  type StepDefinitionEntry,
} from '../src/verifiers/bdd-runner.js';

describe('M4.2 bdd-runner unit suite', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-m4-bdd-'));
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  describe('BddStepRegistry direct methods', () => {
    it('register and getDefinitions store patterns and handlers in order and return this', () => {
      const registry = new BddStepRegistry();
      expect(registry.getDefinitions()).toEqual([]);

      const h1 = (): void => {};
      const h2 = (): void => {};
      const chained = registry.register('exact step', h1).register(/^qty (\d+)$/, h2);
      expect(chained).toBe(registry);

      const defs: StepDefinitionEntry[] = registry.getDefinitions();
      expect(defs).toHaveLength(2);
      expect(defs[0]).toEqual({ pattern: 'exact step', handler: h1 });
      expect(defs[1].pattern).toEqual(/^qty (\d+)$/);
      expect(defs[1].handler).toBe(h2);
    });
  });

  describe('Table & Row Parsers', () => {
    it('parseTableRowCells trims outer pipes and cells including boundary cases', () => {
      expect(parseTableRowCells('  | key | val |  ')).toEqual(['key', 'val']);
      expect(parseTableRowCells('a | b | c')).toEqual(['a', 'b', 'c']);
      expect(parseTableRowCells('| only |')).toEqual(['only']);
      expect(parseTableRowCells('')).toEqual(['']);
    });

    it('attachStepTableRow handles undefined step, narrow rows, and overwrites', () => {
      attachStepTableRow(undefined, ['k', 'v']);

      const step: ParsedStepItem = { keyword: 'Given', text: 'table' };
      attachStepTableRow(step, ['single']);
      expect(step.table).toBeUndefined();

      attachStepTableRow(step, ['role', 'user']);
      attachStepTableRow(step, ['role', 'admin']);
      attachStepTableRow(step, ['status', 'active']);
      expect(step.table).toEqual({ role: 'admin', status: 'active' });
    });

    it('attachExampleRow handles null scenario, header initialization, missing cells, and extra cells', () => {
      expect(attachExampleRow(null, ['a'], ['1'])).toEqual(['a']);

      const scenario: ParsedScenarioBlock = {
        name: 'Outline',
        tags: [],
        isOutline: true,
        steps: [],
        examples: [],
      };
      const headers = attachExampleRow(scenario, [], ['a', 'b']);
      expect(headers).toEqual(['a', 'b']);
      expect(scenario.examples).toEqual([]);

      attachExampleRow(scenario, headers, ['1']);
      attachExampleRow(scenario, headers, ['2', '3', 'extra']);
      expect(scenario.examples).toEqual([
        { a: '1', b: '' },
        { a: '2', b: '3' },
      ]);
    });
  });

  describe('Feature Parser State Machine', () => {
    it('createInitialParseState initializes clean default state', () => {
      const state: FeatureParseState = createInitialParseState();
      expect(state).toEqual({
        featureName: 'Unnamed Feature',
        featureTags: [],
        pendingTags: [],
        backgroundSteps: [],
        scenarios: [],
        currentScenario: null,
        inBackground: false,
        inExamples: false,
        exampleHeaders: [],
      });
    });

    it('handleStructuralHeaderLine parses English/Spanish headers and returns false otherwise', () => {
      const state = createInitialParseState();
      state.pendingTags = ['@FR-1'];
      expect(handleStructuralHeaderLine('Característica: Pagos', state)).toBe(true);
      expect(state.featureName).toBe('Pagos');
      expect(state.featureTags).toEqual(['@FR-1']);
      expect(state.pendingTags).toEqual([]);

      expect(handleStructuralHeaderLine('Antecedentes:', state)).toBe(true);
      expect(state.inBackground).toBe(true);
      expect(state.inExamples).toBe(false);

      state.exampleHeaders = ['old'];
      expect(handleStructuralHeaderLine('Ejemplos:', state)).toBe(true);
      expect(state.inExamples).toBe(true);
      expect(state.exampleHeaders).toEqual([]);

      expect(handleStructuralHeaderLine('Given something', state)).toBe(false);
    });

    it('startScenarioBlock creates scenario or outline inheriting feature and pending tags', () => {
      const state = createInitialParseState();
      state.featureTags = ['@FR-1'];
      state.pendingTags = ['@boundary'];
      state.inBackground = true;
      state.inExamples = true;

      const m = 'Esquema del escenario: Bounds'.match(/^(Scenario|Escenario|Scenario Outline|Esquema del escenario):\s*(.+)$/i)!;
      startScenarioBlock(m, state);

      expect(state.inBackground).toBe(false);
      expect(state.inExamples).toBe(false);
      expect(state.pendingTags).toEqual([]);
      expect(state.scenarios).toHaveLength(1);
      expect(state.currentScenario).toEqual({
        name: 'Bounds',
        tags: ['@FR-1', '@boundary'],
        isOutline: true,
        steps: [],
        examples: [],
      });
    });

    it('appendParsedStep routes to background, current scenario, or no-ops cleanly', () => {
      const state = createInitialParseState();
      const stepMatch = 'Given a user'.match(/^(Given|When|Then|And|But|Dado|Cuando|Entonces|Y|Pero)\s+(.+)$/i)!;

      // Malformed orphan step before Background/Scenario
      appendParsedStep(stepMatch, state);
      expect(state.backgroundSteps).toEqual([]);

      state.inBackground = true;
      appendParsedStep(stepMatch, state);
      expect(state.backgroundSteps).toEqual([{ keyword: 'Given', text: 'a user' }]);

      state.inBackground = false;
      const scenMatch = 'Scenario: S'.match(/^(Scenario|Escenario|Scenario Outline|Esquema del escenario):\s*(.+)$/i)!;
      startScenarioBlock(scenMatch, state);
      appendParsedStep(stepMatch, state);
      expect(state.currentScenario?.steps).toEqual([{ keyword: 'Given', text: 'a user' }]);
    });

    it('handleScenarioOrStepLine dispatches scenarios, English/Spanish steps, and ignores text', () => {
      const state = createInitialParseState();
      handleScenarioOrStepLine('Scenario: Login', state);
      handleScenarioOrStepLine('Cuando envío credenciales', state);
      handleScenarioOrStepLine('Unrecognized narrative line', state);

      expect(state.scenarios).toHaveLength(1);
      expect(state.scenarios[0].steps).toEqual([{ keyword: 'Cuando', text: 'envío credenciales' }]);
    });

    it('processFeatureLine handles comments, blank lines, tags, tables, headers, and steps', () => {
      const state = createInitialParseState();
      const lines = [
        '   ',
        '# comment',
        '@FR-2 @smoke',
        'Feature: Orders',
        'Background:',
        'Given config:',
        '  | env | prod |',
        'Scenario Outline: Place order',
        'When qty is <n>',
        '  | item | book |',
        'Examples:',
        '  | n |',
        '  | 3 |',
      ];
      for (const l of lines) processFeatureLine(l, state);

      expect(state.featureName).toBe('Orders');
      expect(state.backgroundSteps[0].table).toEqual({ env: 'prod' });
      expect(state.scenarios[0].steps[0].table).toEqual({ item: 'book' });
      expect(state.scenarios[0].examples).toEqual([{ n: '3' }]);
    });
  });

  describe('Outline Expansion & Step Execution Engine', () => {
    it('interpolatePlaceholders substitutes tokens and avoids R4-BUG-1 $ and regex bugs', () => {
      expect(interpolatePlaceholders('<a> and <b> and <a>', { a: '1', b: '2' })).toBe('1 and 2 and 1');
      expect(interpolatePlaceholders('keep <missing>', { a: '1' })).toBe('keep <missing>');

      // R4-BUG-1 regression: '$100' / '$&' and regex metacharacters in key names
      expect(interpolatePlaceholders('pay <amount> for <a+b> [x[0]]', { amount: '$100 $&', 'a+b': 'items' })).toBe(
        'pay $100 $& for items [x[0]]'
      );
    });

    it('expandScenarioOutlines expands examples and keeps non-outlines or empty-example outlines intact', () => {
      const scenarios: ParsedScenarioBlock[] = [
        { name: 'Regular', tags: ['@t'], isOutline: false, steps: [{ keyword: 'Given', text: 'x' }], examples: [] },
        { name: 'EmptyOutline', tags: [], isOutline: true, steps: [{ keyword: 'Given', text: '<v>' }], examples: [] },
        {
          name: 'Multi',
          tags: ['@o'],
          isOutline: true,
          steps: [{ keyword: 'When', text: 'send <v>' }],
          examples: [{ v: '10' }, { v: '20' }],
        },
      ];
      const expanded = expandScenarioOutlines(scenarios);
      expect(expanded).toHaveLength(4);
      expect(expanded[0].name).toBe('Regular');
      expect(expanded[1].name).toBe('EmptyOutline');
      expect(expanded[2]).toEqual({
        name: 'Multi (Example #1)',
        tags: ['@o'],
        isOutline: false,
        steps: [{ keyword: 'When', text: 'send 10', table: undefined }],
        examples: [],
      });
      expect(expanded[3].name).toBe('Multi (Example #2)');
    });

    it('matchStepDefinition matches exact strings, regex groups, first-match-wins, and R4-BUG-3 /g /y flags with dirty lastIndex', () => {
      const h1 = (): void => {};
      const h2 = (): void => {};
      const h3 = (): void => {};
      const globalRe = /^send (\d+) EUR$/g;
      globalRe.lastIndex = 5;
      const stickyRe = /^sticky (\d+) (\w+)$/y;
      stickyRe.lastIndex = 5;
      const defs: StepDefinitionEntry[] = [
        { pattern: 'exact match', handler: h1 },
        { pattern: globalRe, handler: h2 },
        { pattern: stickyRe, handler: h3 },
        { pattern: /^send (\d+) EUR$/, handler: h1 },
      ];

      expect(matchStepDefinition('exact match', defs)).toEqual({ entry: defs[0], args: [] });
      expect(matchStepDefinition('no match', defs)).toBeNull();

      // R4-BUG-3 regression: /g flag with dirty lastIndex must not drop capture groups
      const globalMatch = matchStepDefinition('send 42 EUR', defs);
      expect(globalMatch?.entry).toBe(defs[1]);
      expect(globalMatch?.args).toEqual(['42']);

      // R4-BUG-3 regression: /y sticky flag with dirty lastIndex=5 must still match from index 0 and capture groups
      const stickyMatch = matchStepDefinition('sticky 77 ok', defs);
      expect(stickyMatch?.entry).toBe(defs[2]);
      expect(stickyMatch?.args).toEqual(['77', 'ok']);
    });

    it('executeSingleStep covers undefined, sync/async pass, Error failure, and non-Error throw', async () => {
      const defs: StepDefinitionEntry[] = [
        { pattern: 'sync pass', handler: (args) => { expect(args).toEqual([]); } },
        {
          pattern: /^async (\w+)$/,
          handler: async (args, table) => {
            await Promise.resolve();
            expect(args).toEqual(['ok']);
            expect(table).toEqual({ k: 'v' });
          },
        },
        { pattern: 'throws error', handler: () => { throw new Error('boom'); } },
        { pattern: 'throws string', handler: () => { throw 'raw-fail'; } },
      ];

      expect(await executeSingleStep({ keyword: 'Given', text: 'missing' }, defs)).toEqual({
        keyword: 'Given',
        text: 'missing',
        status: 'undefined',
        durationMs: 0,
      });

      const syncRes = await executeSingleStep({ keyword: 'Given', text: 'sync pass' }, defs);
      expect(syncRes.status).toBe('passed');

      const asyncRes = await executeSingleStep({ keyword: 'When', text: 'async ok', table: { k: 'v' } }, defs);
      expect(asyncRes.status).toBe('passed');

      const errRes = await executeSingleStep({ keyword: 'Then', text: 'throws error' }, defs);
      expect(errRes.status).toBe('failed');
      expect(errRes.errorMessage).toBe('boom');

      const strRes = await executeSingleStep({ keyword: 'Then', text: 'throws string' }, defs);
      expect(strRes.status).toBe('failed');
      expect(strRes.errorMessage).toBe('raw-fail');
    });

    it('executeScenarioSteps skips remaining steps after failure or undefined and handles empty steps', async () => {
      const defs: StepDefinitionEntry[] = [
        { pattern: 'ok', handler: () => {} },
        { pattern: 'fail', handler: () => { throw new Error('stop'); } },
      ];

      expect(await executeScenarioSteps([], defs)).toEqual({ stepResults: [], status: 'passed' });

      const failed = await executeScenarioSteps(
        [
          { keyword: 'Given', text: 'ok' },
          { keyword: 'When', text: 'fail' },
          { keyword: 'Then', text: 'ok' },
        ],
        defs
      );
      expect(failed.status).toBe('failed');
      expect(failed.stepResults.map((s) => s.status)).toEqual(['passed', 'failed', 'skipped']);

      const undef = await executeScenarioSteps(
        [
          { keyword: 'Given', text: 'unknown' },
          { keyword: 'Then', text: 'ok' },
        ],
        defs
      );
      expect(undef.status).toBe('undefined');
      expect(undef.stepResults.map((s) => s.status)).toEqual(['undefined', 'skipped']);
    });

    it('runAllExpandedScenarios prepends background steps to expanded scenarios', async () => {
      const doc: ParsedFeatureDocument = parseFeatureDocument([
        'Feature: BG',
        'Background:',
        '  Given setup',
        'Scenario Outline: Run',
        '  When value <n>',
        'Examples:',
        '  | n |',
        '  | 1 |',
        '  | 2 |',
      ].join('\n'));
      const seen: string[] = [];
      const defs: StepDefinitionEntry[] = [
        { pattern: 'setup', handler: () => { seen.push('setup'); } },
        { pattern: /^value (\d+)$/, handler: (args) => { seen.push(args[0]); } },
      ];

      const results = await runAllExpandedScenarios(doc, defs);
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.status === 'passed')).toBe(true);
      expect(seen).toEqual(['setup', '1', 'setup', '2']);
    });
  });

  describe('Hashing & Git Commit Resolution', () => {
    it('computeLfSha256 normalizes CRLF to LF and matches SHA-256 of empty string', () => {
      expect(computeLfSha256('a\r\nb\r\n')).toBe(computeLfSha256('a\nb\n'));
      expect(computeLfSha256('a')).not.toBe(computeLfSha256('b'));
      expect(computeLfSha256('')).toBe(crypto.createHash('sha256').update('').digest('hex'));
    });

    it('resolveCurrentGitCommit returns SHA in git repo, null in non-git/uncommitted/missing dirs', () => {
      expect(resolveCurrentGitCommit(process.cwd())).toMatch(/^[0-9a-f]{40}$/);
      expect(resolveCurrentGitCommit(tmpDir)).toBeNull();
      expect(resolveCurrentGitCommit(path.join(tmpDir, 'nonexistent'))).toBeNull();

      const repoDir = path.join(tmpDir, 'repo');
      fs.mkdirSync(repoDir);
      execFileSync('git', ['init'], { cwd: repoDir, stdio: 'ignore' });
      execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repoDir, stdio: 'ignore' });
      execFileSync('git', ['config', 'user.name', 'Test'], { cwd: repoDir, stdio: 'ignore' });
      expect(resolveCurrentGitCommit(repoDir)).toBeNull();

      fs.writeFileSync(path.join(repoDir, 'a.txt'), 'hello\n', 'utf-8');
      execFileSync('git', ['add', 'a.txt'], { cwd: repoDir, stdio: 'ignore' });
      execFileSync('git', ['commit', '-m', 'init'], { cwd: repoDir, stdio: 'ignore' });
      const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoDir, encoding: 'utf-8' }).trim();
      expect(resolveCurrentGitCommit(repoDir)).toBe(head);
    });
  });

  describe('Cucumber JSON Serialization & Attestation', () => {
    it('mapStepToCucumberJson and buildBaseCucumberFeature serialize step and feature shapes', () => {
      const step: BddStepExecution = {
        keyword: 'Given',
        text: 'a step',
        status: 'failed',
        durationMs: 3,
        errorMessage: 'err',
      };
      expect(mapStepToCucumberJson(step)).toEqual({
        keyword: 'Given ',
        name: 'a step',
        result: { status: 'failed', duration: 3_000_000, error_message: 'err' },
      });

      const okStep: BddStepExecution = { keyword: 'Then', text: 'done', status: 'passed', durationMs: 1 };
      expect(mapStepToCucumberJson(okStep).result).not.toHaveProperty('error_message');

      const report: BddFeatureExecutionReport = {
        uri: 'tests/a.feature',
        featureName: 'Feat',
        tags: ['@FR-1'],
        passed: true,
        scenarios: [{ name: 'Sc', tags: ['@nominal'], status: 'passed', steps: [okStep] }],
      };
      const base = buildBaseCucumberFeature(report);
      expect(base.uri).toBe('tests/a.feature');
      expect(base.name).toBe('Feat');
      expect(base.tags).toEqual([{ name: '@FR-1' }]);
      expect(base.elements[0].type).toBe('scenario');
    });

    it('computeAttestationSignature, resolveFeatureHashForReport, and mapFeatureToCucumberJson produce valid signatures and avoid R4-BUG-2 EISDIR', () => {
      const sigNoGit = computeAttestationSignature('u.feature', 'a'.repeat(64), null, 'b'.repeat(64));
      const sigWithGit = computeAttestationSignature('u.feature', 'a'.repeat(64), 'c'.repeat(40), 'b'.repeat(64));
      expect(sigNoGit).toMatch(/^[0-9a-f]{64}$/);
      expect(sigNoGit).not.toBe(sigWithGit);

      const featFile = path.join(tmpDir, 'tests', 'f.feature');
      fs.mkdirSync(path.dirname(featFile), { recursive: true });
      fs.writeFileSync(featFile, 'Feature: Hash\r\n', 'utf-8');

      const baseReport: BddFeatureExecutionReport = {
        uri: 'tests/f.feature',
        featureName: 'Hash',
        tags: [],
        passed: true,
        scenarios: [],
      };
      expect(resolveFeatureHashForReport({ ...baseReport, featureSha256: 'd'.repeat(64) }, tmpDir)).toBe('d'.repeat(64));
      expect(resolveFeatureHashForReport(baseReport, tmpDir)).toBe(computeLfSha256('Feature: Hash\n'));
      expect(resolveFeatureHashForReport({ ...baseReport, uri: 'missing.feature' }, tmpDir)).toBe(computeLfSha256(''));

      // R4-BUG-2 regression: directory, empty, undefined, or null uri does not throw EISDIR or TypeError
      expect(resolveFeatureHashForReport({ ...baseReport, uri: 'tests' }, tmpDir)).toBe(computeLfSha256(''));
      expect(resolveFeatureHashForReport({ ...baseReport, uri: '' }, tmpDir)).toBe(computeLfSha256(''));
      expect(resolveFeatureHashForReport({ ...baseReport, uri: undefined as unknown as string }, tmpDir)).toBe(
        computeLfSha256('')
      );
      expect(resolveFeatureHashForReport({ ...baseReport, uri: null as unknown as string }, tmpDir)).toBe(
        computeLfSha256('')
      );

      const prevEpoch = process.env.SOURCE_DATE_EPOCH;
      process.env.SOURCE_DATE_EPOCH = '1700000000';
      try {
        const mapped = mapFeatureToCucumberJson({ ...baseReport, commitSha: null }, tmpDir);
        expect(mapped.attestation.attestedAt).toBe('2023-11-14T22:13:20.000Z');
        expect(mapped.attestation.commitSha).toBeNull();
        expect(mapped.attestation.signatureSha256).toBe(
          computeAttestationSignature(
            mapped.uri,
            mapped.attestation.featureSha256,
            null,
            mapped.attestation.reportDigestSha256
          )
        );
      } finally {
        if (prevEpoch === undefined) delete process.env.SOURCE_DATE_EPOCH;
        else process.env.SOURCE_DATE_EPOCH = prevEpoch;
      }
    });
  });

  describe('Attestation Verification & Report Loader', () => {
    it('verifyFeatureDiskSha256 checks disk match, drift, missing, and R4-BUG-2 directory uri', () => {
      const featFile = path.join(tmpDir, 'tests', 'disk.feature');
      fs.mkdirSync(path.dirname(featFile), { recursive: true });
      fs.writeFileSync(featFile, 'Feature: Disk\r\n', 'utf-8');
      const expectedSha = computeLfSha256('Feature: Disk\n');

      const okErrors: string[] = [];
      verifyFeatureDiskSha256(tmpDir, 'tests/disk.feature', expectedSha, okErrors);
      expect(okErrors).toEqual([]);

      const driftErrors: string[] = [];
      verifyFeatureDiskSha256(tmpDir, 'tests/disk.feature', '0'.repeat(64), driftErrors);
      expect(driftErrors[0]).toContain('drift detected');

      const missingErrors: string[] = [];
      verifyFeatureDiskSha256(tmpDir, '', expectedSha, missingErrors);
      verifyFeatureDiskSha256(tmpDir, 'tests/nope.feature', expectedSha, missingErrors);
      // R4-BUG-2 regression: directory, undefined, or null uri records missing error instead of throwing EISDIR/TypeError
      verifyFeatureDiskSha256(tmpDir, 'tests', expectedSha, missingErrors);
      verifyFeatureDiskSha256(tmpDir, undefined as unknown as string, expectedSha, missingErrors);
      verifyFeatureDiskSha256(tmpDir, null as unknown as string, expectedSha, missingErrors);
      expect(missingErrors).toHaveLength(5);
      expect(missingErrors.every((e) => e.includes('missing on disk'))).toBe(true);
    });

    it('verifyCommitBinding validates required commit matching', () => {
      const att: BddAttestationRecord = {
        featureUri: 'u.feature',
        featureSha256: 'a'.repeat(64),
        commitSha: 'c'.repeat(40),
        reportDigestSha256: 'b'.repeat(64),
        signatureSha256: 'd'.repeat(64),
        attestedAt: '2026-01-01T00:00:00.000Z',
      };

      const errors: string[] = [];
      verifyCommitBinding(att, 'u.feature', 'e'.repeat(40), false, errors);
      verifyCommitBinding(att, 'u.feature', null, true, errors);
      verifyCommitBinding(att, 'u.feature', 'c'.repeat(40), true, errors);
      expect(errors).toEqual([]);

      verifyCommitBinding(att, 'u.feature', 'e'.repeat(40), true, errors);
      verifyCommitBinding({ ...att, commitSha: null }, 'u.feature', 'e'.repeat(40), true, errors);
      expect(errors).toHaveLength(2);
      expect(errors[0]).toContain('commit mismatch');
      expect(errors[1]).toContain('got none');
    });

    it('verifyReportDigestAndSig and verifySingleFeatureAttestation detect tampering and missing attestation', () => {
      const featFile = path.join(tmpDir, 'a.feature');
      fs.writeFileSync(featFile, 'Feature: A\n', 'utf-8');
      const report: BddFeatureExecutionReport = {
        uri: 'a.feature',
        featureName: 'A',
        tags: [],
        passed: true,
        scenarios: [],
        commitSha: null,
      };
      const entry = mapFeatureToCucumberJson(report, tmpDir) as unknown as Record<string, unknown>;
      const att = entry.attestation as BddAttestationRecord;

      const okErrors: string[] = [];
      verifyReportDigestAndSig(entry, att, 'a.feature', okErrors);
      expect(okErrors).toEqual([]);

      const badErrors: string[] = [];
      verifyReportDigestAndSig(
        entry,
        { ...att, reportDigestSha256: '0'.repeat(64), signatureSha256: '1'.repeat(64) },
        'a.feature',
        badErrors
      );
      expect(badErrors).toHaveLength(2);
      expect(badErrors[0]).toContain('report digest mismatch');
      expect(badErrors[1]).toContain('signature mismatch');

      expect(verifySingleFeatureAttestation({ uri: 'a.feature' }, tmpDir, null, false, [])).toBe(false);
      expect(verifySingleFeatureAttestation({ uri: 'a.feature', attestation: null }, tmpDir, null, false, [])).toBe(false);
      expect(verifySingleFeatureAttestation(null, tmpDir, null, false, [])).toBe(false);
      expect(verifySingleFeatureAttestation(undefined, tmpDir, null, false, [])).toBe(false);
      expect(verifySingleFeatureAttestation([] as unknown as Record<string, unknown>, tmpDir, null, false, [])).toBe(false);

      const fullErrors: string[] = [];
      expect(verifySingleFeatureAttestation(entry, tmpDir, null, false, fullErrors)).toBe(true);
      expect(fullErrors).toEqual([]);
    });

    it('verifyAttestationEntry and verifyBddReportAttestation handle valid, unattested, and [null] entries without crashing', () => {
      const featFile = path.join(tmpDir, 'tests', 'att.feature');
      fs.mkdirSync(path.dirname(featFile), { recursive: true });
      fs.writeFileSync(featFile, 'Feature: Att\n', 'utf-8');
      const report: BddFeatureExecutionReport = {
        uri: 'tests/att.feature',
        featureName: 'Att',
        tags: [],
        passed: true,
        scenarios: [],
        commitSha: null,
      };
      const attestedEntry = mapFeatureToCucumberJson(report, tmpDir) as unknown as Record<string, unknown>;

      const entryErrs: string[] = [];
      expect(verifyAttestationEntry(attestedEntry, tmpDir, null, false, true, entryErrs)).toBe(true);
      expect(entryErrs).toEqual([]);

      expect(verifyAttestationEntry({ uri: 'tests/x.feature' }, tmpDir, null, false, false, entryErrs)).toBe(false);
      expect(entryErrs).toEqual([]);
      expect(verifyAttestationEntry({ uri: 'tests/x.feature' }, tmpDir, null, false, true, entryErrs)).toBe(false);
      expect(entryErrs[0]).toContain('Missing SHA-256 attestation for feature tests/x.feature');

      const nullErrs: string[] = [];
      expect(verifyAttestationEntry(null, tmpDir, null, false, false, nullErrs)).toBe(false);
      expect(nullErrs[0]).toContain('Malformed non-object feature entry');

      const arrErrs: string[] = [];
      expect(verifyAttestationEntry([], tmpDir, null, false, false, arrErrs)).toBe(false);
      expect(arrErrs[0]).toContain('Malformed non-object feature entry');

      // verifyBddReportAttestation on [null], [[]], and [null, failedFeature] must not throw TypeError or bypass as valid
      const nullReportPath = path.join(tmpDir, 'null-report.json');
      fs.writeFileSync(nullReportPath, JSON.stringify([null]), 'utf-8');
      const nullResReq = verifyBddReportAttestation(nullReportPath, tmpDir, { requireAttestation: true });
      expect(nullResReq.valid).toBe(false);
      expect(nullResReq.hasAttestation).toBe(false);
      expect(nullResReq.errors[0]).toContain('Malformed non-object feature entry');

      const nullResOpt = verifyBddReportAttestation(nullReportPath, tmpDir, { requireAttestation: false });
      expect(nullResOpt.valid).toBe(false);
      expect(nullResOpt.errors[0]).toContain('Malformed non-object feature entry');

      const nestedArrPath = path.join(tmpDir, 'nested-arr-report.json');
      fs.writeFileSync(nestedArrPath, JSON.stringify([[]]), 'utf-8');
      const nestedArrOpt = verifyBddReportAttestation(nestedArrPath, tmpDir, { requireAttestation: false });
      expect(nestedArrOpt.valid).toBe(false);
      expect(nestedArrOpt.hasAttestation).toBe(false);
      expect(nestedArrOpt.errors[0]).toContain('Malformed non-object feature entry');

      const mixedFailPath = path.join(tmpDir, 'mixed-fail.json');
      fs.writeFileSync(
        mixedFailPath,
        JSON.stringify([null, { uri: 'tests/att.feature', elements: [{ steps: [{ result: { status: 'failed' } }] }] }]),
        'utf-8'
      );
      const mixedFailRes = verifyBddReportAttestation(mixedFailPath, tmpDir, { requireAttestation: false });
      expect(mixedFailRes.valid).toBe(false);
      expect(mixedFailRes.errors[0]).toContain('Malformed non-object feature entry');

      const validReportPath = path.join(tmpDir, 'valid-report.json');
      fs.writeFileSync(validReportPath, JSON.stringify([attestedEntry]), 'utf-8');
      const validRes = verifyBddReportAttestation(validReportPath, tmpDir, { requireAttestation: true });
      expect(validRes).toEqual({ valid: true, hasAttestation: true, errors: [], verifiedFeatures: 1 });
    });

    it('loadCucumberReportArray handles missing, invalid JSON, non-array JSON, and valid arrays', () => {
      expect(loadCucumberReportArray(path.join(tmpDir, 'missing.json')).error).toContain('Missing BDD report');

      const badJson = path.join(tmpDir, 'bad.json');
      fs.writeFileSync(badJson, '{oops', 'utf-8');
      expect(loadCucumberReportArray(badJson).error).toBe('Invalid JSON in cucumber-report.json');

      const objJson = path.join(tmpDir, 'obj.json');
      fs.writeFileSync(objJson, '{}', 'utf-8');
      expect(loadCucumberReportArray(objJson).error).toBe('Cucumber report must be a JSON array');

      const validJson = path.join(tmpDir, 'ok.json');
      fs.writeFileSync(validJson, '[{"uri":"a.feature"}]', 'utf-8');
      expect(loadCucumberReportArray(validJson)).toEqual({ entries: [{ uri: 'a.feature' }] });
    });
  });
});
