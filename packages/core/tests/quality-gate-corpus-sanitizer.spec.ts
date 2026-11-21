/**
 * AI-SDLC: Gate 1 Lexical Corpus Sanitizer & Per-File Isolation Unit Tests
 * Tag: @FR-046-NATIVE-SDK-CLI-AST-001
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  auditUnitTestsPerFunction,
  buildTestReferencePatterns,
  collectUnitTestCorpus,
  collectUnitTestFiles,
  consumeRegexFlags,
  consumeWordToken,
  formatTemplateResult,
  hasTargetLiteral,
  isCandidateIdentifierLiteral,
  isFunctionReferencedInPreSanitizedFiles,
  isFunctionReferencedInTests,
  isTargetIdentifierLiteral,
  loadPreSanitizedTestFiles,
  preSanitizeTestFile,
  sanitizeTestCorpus,
  scanCodeSegment,
  scanCommentToken,
  scanLineComment,
  scanRegexLiteral,
  scanSingleQuotedLiteral,
  scanTemplateLiteral,
  scanTripleQuotedLiteral,
  stepCodeToken,
  stepPunctToken,
  stepQuotedOrTemplate,
  tryScanCommentOrRegex,
  verifyQualityGate,
  type ScanState,
} from '../src/verifiers/quality-gate.js';
import type { AnalysisResult } from '../src/types/index.js';

describe('@FR-046-NATIVE-SDK-CLI-AST-001: Gate 1 Lexical Corpus Sanitizer', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-qg-sanitizer-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  describe('Identifier literal predicates', () => {
    it('isTargetIdentifierLiteral matches exact, hashed, dotted, and call-suffixed forms and rejects prose', () => {
      expect(isTargetIdentifierLiteral('targetFn', 'targetFn')).toBe(true);
      expect(isTargetIdentifierLiteral(' #targetFn ', 'targetFn')).toBe(true);
      expect(isTargetIdentifierLiteral('.targetFn', 'targetFn')).toBe(true);
      expect(isTargetIdentifierLiteral('targetFn()', 'targetFn')).toBe(true);
      expect(isTargetIdentifierLiteral('should invoke targetFn', 'targetFn')).toBe(false);
      expect(isTargetIdentifierLiteral('targetFn', '')).toBe(false);
    });

    it('isCandidateIdentifierLiteral accepts single identifiers and rejects multi-word prose', () => {
      expect(isCandidateIdentifierLiteral('myHelper')).toBe(true);
      expect(isCandidateIdentifierLiteral(' #myHelper ')).toBe(true);
      expect(isCandidateIdentifierLiteral('.myHelper')).toBe(true);
      expect(isCandidateIdentifierLiteral('myHelper()')).toBe(true);
      expect(isCandidateIdentifierLiteral('should call myHelper safely')).toBe(false);
      expect(isCandidateIdentifierLiteral('')).toBe(false);
    });

    it('hasTargetLiteral checks all canonical forms in a literal set', () => {
      expect(hasTargetLiteral(new Set(['alpha']), 'alpha')).toBe(true);
      expect(hasTargetLiteral(new Set(['#alpha']), 'alpha')).toBe(true);
      expect(hasTargetLiteral(new Set(['.alpha']), 'alpha')).toBe(true);
      expect(hasTargetLiteral(new Set(['alpha()']), 'alpha')).toBe(true);
      expect(hasTargetLiteral(new Set(['beta', 'alpha prose']), 'alpha')).toBe(false);
    });
  });

  describe('Comment, regex, and string literal scanners', () => {
    it('scanLineComment and scanCommentToken strip //, /* */, and line-leading # while preserving obj.#prop', () => {
      const lineOnly = '// comment\ncode()';
      expect(scanLineComment(lineOnly, 2)).toEqual({ nextIndex: 10, text: ' ' });
      expect(scanLineComment('// no newline', 2)).toEqual({ nextIndex: 13, text: ' ' });

      expect(scanCommentToken('/* block */ next', 0)).toEqual({ nextIndex: 11, text: ' ' });
      expect(scanCommentToken('/* unclosed', 0)).toEqual({ nextIndex: 11, text: ' ' });
      expect(scanCommentToken('// line\ncode', 0)).toEqual({ nextIndex: 7, text: ' ' });
      expect(scanCommentToken('# py comment\nx = 1', 0)).toEqual({ nextIndex: 12, text: ' ' });
      expect(scanCommentToken('  # indented\nx = 1', 2)).toEqual({ nextIndex: 12, text: ' ' });
      expect(scanCommentToken('obj.#priv', 4)).toBeNull();
      expect(scanCommentToken('a / b', 2)).toBeNull();
    });

    it('consumeRegexFlags and scanRegexLiteral handle character classes, escapes, and unterminated division', () => {
      expect(consumeRegexFlags('gim2', 0)).toBe(3);
      expect(scanRegexLiteral('/[\'"`]\\/\\*/gi + 1', 0)).toEqual({ nextIndex: 13, consumed: true });
      expect(scanRegexLiteral('/[//]/m', 0)).toEqual({ nextIndex: 7, consumed: true });
      expect(scanRegexLiteral('/unterminated\nnext()', 0)).toEqual({ nextIndex: 0, consumed: false });
      expect(scanRegexLiteral('/trailing\\', 0)).toEqual({ nextIndex: 0, consumed: false });
      expect(scanRegexLiteral('/escaped\\\nnext()', 0)).toEqual({ nextIndex: 0, consumed: false });
    });

    it('scanSingleQuotedLiteral handles escaped quotes, CRLF continuations, and unclosed newline stops', () => {
      const keepNone = () => false;
      const keepTarget = (inner: string) => inner === 'targetFn';

      expect(scanSingleQuotedLiteral("'it\\'s /* fine'", 0, "'", keepNone)).toEqual({ nextIndex: 15, text: "''" });
      expect(scanSingleQuotedLiteral("'targetFn'", 0, "'", keepTarget)).toEqual({ nextIndex: 10, text: "'targetFn'" });
      expect(scanSingleQuotedLiteral('"C:\\\\path\\\\"', 0, '"', keepNone)).toEqual({ nextIndex: 12, text: '""' });
      expect(scanSingleQuotedLiteral("'line\\\r\ncont'", 0, "'", keepNone)).toEqual({ nextIndex: 13, text: "''" });
      expect(scanSingleQuotedLiteral("'unclosed\nrealFn()", 0, "'", keepNone)).toEqual({ nextIndex: 9, text: "''" });
      expect(scanSingleQuotedLiteral("'eof-unclosed", 0, "'", keepNone)).toEqual({ nextIndex: 13, text: "''" });
    });

    it('scanTripleQuotedLiteral handles Python/C# multi-line strings and EOF termination', () => {
      const keepTarget = (inner: string) => inner.trim() === 'targetFn';
      expect(scanTripleQuotedLiteral('"""fakeFn()\n/* comment */"""', 0, '"', keepTarget)).toEqual({
        nextIndex: 28,
        text: '""',
      });
      expect(scanTripleQuotedLiteral("'''targetFn'''", 0, "'", keepTarget)).toEqual({
        nextIndex: 14,
        text: "'''targetFn'''",
      });
      expect(scanTripleQuotedLiteral('"""escaped \\""" end"""', 0, '"', keepTarget)).toEqual({
        nextIndex: 22,
        text: '""',
      });
      expect(scanTripleQuotedLiteral('"""unclosed eof', 0, '"', keepTarget)).toEqual({
        nextIndex: 15,
        text: '""',
      });
    });

    it('formatTemplateResult and scanTemplateLiteral preserve nested ${...} code and strip static prose', () => {
      const keepTarget = (inner: string) => isTargetIdentifierLiteral(inner, 'targetFn');

      expect(formatTemplateResult('`targetFn`', 0, 9, [], keepTarget)).toBe('`targetFn`');
      expect(formatTemplateResult('`prose`', 0, 6, [], keepTarget)).toBe('``');
      expect(formatTemplateResult('`a ${x}`', 0, 7, ['x'], keepTarget)).toBe('`${x}`');

      const nested = '`outer ${`inner ${targetFn()}`} and ${ { a: 1, b: { c: obj[\'/*\'] } } }`';
      const scanned = scanTemplateLiteral(nested, 0, keepTarget);
      expect(scanned.nextIndex).toBe(nested.length);
      expect(scanned.text).toContain('targetFn()');
      expect(scanned.text).not.toContain('outer');

      const escaped = '`\\` \\${fakeFn()} prose`';
      expect(scanTemplateLiteral(escaped, 0, keepTarget)).toEqual({ nextIndex: escaped.length, text: '``' });

      const unclosed = '`prefix ${targetFn()';
      const unclosedRes = scanTemplateLiteral(unclosed, 0, keepTarget);
      expect(unclosedRes.nextIndex).toBe(unclosed.length);
      expect(unclosedRes.text).toContain('targetFn()');
    });
  });

  describe('State machine steps & scanCodeSegment', () => {
    it('consumeWordToken, stepPunctToken, stepQuotedOrTemplate, tryScanCommentOrRegex, stepCodeToken, and scanCodeSegment coordinate accurately', () => {
      const state: ScanState = {
        src: 'return /re/g + "s" + { a: 1 } }',
        stopOnBrace: true,
        index: 0,
        braceDepth: 1,
        allowRegex: true,
        out: [],
      };

      // 'return' sets allowRegex = true
      consumeWordToken(state);
      expect(state.out.join('')).toBe('return');
      expect(state.allowRegex).toBe(true);

      // space keeps allowRegex = true
      expect(stepPunctToken(state)).toBe(false);
      expect(state.allowRegex).toBe(true);

      // '/re/g' consumed as regex
      expect(tryScanCommentOrRegex(state)).toBe(true);
      expect(state.allowRegex).toBe(false);

      // ' + ' sets allowRegex = true
      stepCodeToken(state, () => false);
      stepCodeToken(state, () => false);
      stepCodeToken(state, () => false);
      expect(state.allowRegex).toBe(true);

      // '"s"' sets allowRegex = false
      stepQuotedOrTemplate(state, '"', () => false);
      expect(state.allowRegex).toBe(false);

      // Full segment with division vs regex and nested braces
      const full = scanCodeSegment(
        'const r = a / b / c;\nconst re = /[\'"`]\\/\\*/;\nreturn targetFn(r, re);',
        0,
        false,
        () => false
      );
      expect(full.text).toContain('a / b / c');
      expect(full.text).toContain('targetFn(r, re)');
      expect(full.text).not.toContain('/*');
    });
  });

  describe('Corpus sanitization, pattern matching, and cross-file isolation', () => {
    it('sanitizeTestCorpus, buildTestReferencePatterns, and isFunctionReferencedInTests handle strings with comment tokens, obj.#prop, and prose rejection', () => {
      const patterns = buildTestReferencePatterns('realFn');
      expect(patterns.length).toBeGreaterThanOrEqual(7);

      const tricky = [
        "const glob = 'packages/*/src';",
        "const url = 'https://example.com/a/*b*/#frag';",
        "const sel = '#submit';",
        'const priv = obj.#prop;',
        'const div = x / y / z;',
        'expect(realFn(glob, url, sel, priv, div)).toBe(true);',
      ].join('\n');

      const sanitized = sanitizeTestCorpus(tricky, 'realFn');
      expect(sanitized).toContain('realFn(');
      expect(sanitized).toContain('obj.#prop');
      expect(isFunctionReferencedInTests('realFn', tricky)).toBe(true);

      // Static text of interpolated template literal must not match
      expect(isFunctionReferencedInTests('run', 'const msg = `should run ${otherFn()}`;')).toBe(false);
      // Comments must not match
      expect(isFunctionReferencedInTests('run', '// run()\n/* run() */\n# run()\n')).toBe(false);
      // Special identifiers
      expect(isFunctionReferencedInTests('anonymous', '')).toBe(true);
      expect(isFunctionReferencedInTests('constructor', '')).toBe(true);
      expect(isFunctionReferencedInTests('', 'run()')).toBe(true);
    });

    it('collectUnitTestFiles, collectUnitTestCorpus, preSanitizeTestFile, and isFunctionReferencedInPreSanitizedFiles isolate malformed files', () => {
      const testsDir = path.join(tmpDir, 'tests');
      fs.mkdirSync(testsDir, { recursive: true });
      const f1 = path.join(testsDir, 'a_malformed.spec.ts');
      const f2 = path.join(testsDir, 'b_valid.spec.ts');

      // Malformed file 1 has unclosed quote, unclosed template, and unclosed /* comment
      fs.writeFileSync(f1, "const s = 'unclosed\nconst t = `unclosed\n/* unclosed comment\n", 'utf-8');
      fs.writeFileSync(f2, "import { spyOn } from 'vitest';\nit('targetFn', () => { targetFn(); });\n", 'utf-8');

      const files = collectUnitTestFiles(tmpDir);
      expect(files.map((f) => path.basename(f)).sort()).toEqual(['a_malformed.spec.ts', 'b_valid.spec.ts']);

      const corpus = collectUnitTestCorpus(tmpDir);
      expect(corpus).toContain('targetFn()');

      const pre1 = preSanitizeTestFile(fs.readFileSync(f1, 'utf-8'));
      const pre2 = preSanitizeTestFile(fs.readFileSync(f2, 'utf-8'));
      const loaded = loadPreSanitizedTestFiles(tmpDir);
      expect(loaded).toHaveLength(2);
      expect(isFunctionReferencedInPreSanitizedFiles('targetFn', loaded)).toBe(true);
      expect(isFunctionReferencedInPreSanitizedFiles('targetFn', [pre1, pre2])).toBe(true);
      expect(isFunctionReferencedInPreSanitizedFiles('missingFn', [pre1, pre2])).toBe(false);
      expect(isFunctionReferencedInPreSanitizedFiles('anonymous', [pre1])).toBe(true);

      // String-literal-only spyOn reference
      const spyFile = preSanitizeTestFile("spyOn(svc, 'onlySpyFn');");
      expect(isFunctionReferencedInPreSanitizedFiles('onlySpyFn', [spyFile])).toBe(true);
    });

    it('auditUnitTestsPerFunction and verifyQualityGate recover functions hidden behind globs/URLs and isolate malformed files', () => {
      const srcDir = path.join(tmpDir, 'src');
      const testsDir = path.join(tmpDir, 'tests');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.mkdirSync(testsDir, { recursive: true });

      fs.writeFileSync(
        path.join(srcDir, 'alpha.ts'),
        'export function alphaFn(): number {\n  return 1;\n}\nexport function untestedFn(): number {\n  return 2;\n}\n',
        'utf-8'
      );
      fs.writeFileSync(
        path.join(testsDir, 'broken.spec.ts'),
        'const g = "packages/*/src";\nconst u = "https://example.com";\n/* unclosed\n',
        'utf-8'
      );
      fs.writeFileSync(
        path.join(testsDir, 'alpha.spec.ts'),
        "import { alphaFn } from '../src/alpha.js';\nit('calls alphaFn', () => { if (alphaFn() !== 1) throw new Error('fail'); });\n",
        'utf-8'
      );

      const mockResults: AnalysisResult[] = [
        {
          functionName: 'alphaFn',
          filePath: path.join(srcDir, 'alpha.ts'),
          relPath: 'src/alpha.ts',
          loc: 3,
          cyclomatic: 1,
          cognitive: 0,
          maintainability: 90,
          codeSmells: [],
          line: 1,
          status: 'PASS',
          violations: [],
        },
        {
          functionName: 'untestedFn',
          filePath: path.join(srcDir, 'alpha.ts'),
          relPath: 'src/alpha.ts',
          loc: 3,
          cyclomatic: 1,
          cognitive: 0,
          maintainability: 90,
          codeSmells: [],
          line: 4,
          status: 'PASS',
          violations: [],
        },
      ];

      const untested = auditUnitTestsPerFunction(mockResults, tmpDir);
      expect(untested).toEqual([{ file: 'src/alpha.ts', functionName: 'untestedFn' }]);
      expect(mockResults[0].status).toBe('PASS');
      expect(mockResults[1].status).toBe('FAIL');

      const gate = verifyQualityGate({
        rootDir: tmpDir,
        requireFunctionUnitTests: true,
        requireCoverageReport: false,
      });
      expect((gate.untestedFunctions ?? []).some((u) => u.functionName === 'alphaFn')).toBe(false);
      expect((gate.untestedFunctions ?? []).some((u) => u.functionName === 'untestedFn')).toBe(true);
    });
  });
});
