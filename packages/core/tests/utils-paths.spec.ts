import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  canonicalSort,
  isReportContentSemanticallyEqual,
  normalizePath,
  stripVolatileReportMetadata,
  walkMdFiles,
} from '../src/utils/fs.js';
import { generateDeterministicUuidV5, resolveDeterministicDate } from '../src/utils/time.js';
import { extractFunctionsPythonAst } from '../src/verifiers/ast/python-ast.js';

describe('Core Utils & Python AST (Happy / Sad / Boundary / Malformed)', () => {
  let tmpDir: string;
  const origEpoch = process.env.SOURCE_DATE_EPOCH;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-utils-'));
  });

  afterEach(() => {
    if (origEpoch !== undefined) process.env.SOURCE_DATE_EPOCH = origEpoch;
    else delete process.env.SOURCE_DATE_EPOCH;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('canonicalSort & normalizePath: sorts by codepoint and normalizes Windows slashes and Unicode (happy/boundary)', () => {
    expect(canonicalSort('a', 'b')).toBe(-1);
    expect(canonicalSort('b', 'a')).toBe(1);
    expect(canonicalSort('a', 'a')).toBe(0);
    expect(normalizePath('a\\b\\c.ts')).toBe('a/b/c.ts');
    expect(normalizePath('')).toBe('');
  });

  it('walkMdFiles: returns empty for non-existent dir, skips excluded and temp-* dirs, collects .md sorted (happy/sad/boundary)', () => {
    expect(walkMdFiles(path.join(tmpDir, 'nope'))).toEqual([]);
    fs.mkdirSync(path.join(tmpDir, 'node_modules'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'temp-work'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'docs'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'node_modules', 'ignore.md'), '# x');
    fs.writeFileSync(path.join(tmpDir, 'temp-work', 'ignore2.md'), '# x');
    fs.writeFileSync(path.join(tmpDir, 'docs', 'b.md'), '# b');
    fs.writeFileSync(path.join(tmpDir, 'a.md'), '# a');

    const files = walkMdFiles(tmpDir).map((f) => path.relative(tmpDir, f).replace(/\\/g, '/'));
    expect(files).toEqual(['a.md', 'docs/b.md']);
  });

  it('stripVolatileReportMetadata & isReportContentSemanticallyEqual: handles Markdown, CycloneDX, SARIF, and malformed JSON (happy/sad/malformed)', () => {
    const md1 = '# Report\r\n> **Generation Date:** 2026-01-01\r\nBody';
    const md2 = '# Report\n> **Generation Date:** 2026-02-02\nBody';
    expect(stripVolatileReportMetadata(md1)).toBe('# Report\nBody');
    expect(isReportContentSemanticallyEqual(md1, md2, '.md')).toBe(true);

    const sbomA = JSON.stringify({ serialNumber: 'urn:uuid:1', components: [{ name: 'a' }] });
    const sbomB = JSON.stringify({ serialNumber: 'urn:uuid:1', components: [{ name: 'a' }], vulnerabilities: [] });
    expect(isReportContentSemanticallyEqual(sbomA, sbomB, 'sbom.cdx.json')).toBe(true);
    expect(isReportContentSemanticallyEqual('{bad json', sbomB, 'sbom.cdx.json')).toBe(false);

    const sarifA = JSON.stringify({ runs: [{ results: [{ ruleId: 'R1' }] }] });
    const sarifB = JSON.stringify({ runs: [{ results: [{ ruleId: 'R1' }] }] });
    expect(isReportContentSemanticallyEqual(sarifA, sarifB, 'security.sarif')).toBe(true);
    expect(isReportContentSemanticallyEqual('{bad sarif', sarifB, 'security.sarif')).toBe(false);
  });

  it('resolveDeterministicDate & generateDeterministicUuidV5: handles boundary and malformed inputs (boundary/malformed)', () => {
    process.env.SOURCE_DATE_EPOCH = '0';
    expect(resolveDeterministicDate(tmpDir)).toBeInstanceOf(Date);

    process.env.SOURCE_DATE_EPOCH = '-50';
    expect(resolveDeterministicDate(tmpDir)).toBeInstanceOf(Date);

    process.env.SOURCE_DATE_EPOCH = 'not-a-number';
    expect(resolveDeterministicDate(tmpDir)).toBeInstanceOf(Date);

    const emptyUuid = generateDeterministicUuidV5('');
    expect(emptyUuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('extractFunctionsPythonAst: parses valid Python, handles syntax error, and falls back when python binary unavailable (happy/malformed/sad)', () => {
    const valid = extractFunctionsPythonAst('def foo(x):\n    if x:\n        return x\n    return 0\n', 'app.py');
    expect(valid.language).toBe('python');
    expect(valid.functions.length).toBeGreaterThanOrEqual(1);

    const malformed = extractFunctionsPythonAst('def broken(:\n  pass\n', 'broken.py');
    expect(malformed.language).toBe('python');
    expect(Array.isArray(malformed.functions)).toBe(true);

    const origPath = process.env.PATH;
    const origPathWin = process.env.Path;
    process.env.PATH = '';
    if (origPathWin !== undefined) process.env.Path = '';
    try {
      const fallback = extractFunctionsPythonAst('def bar():\n    return 1\n', 'bar.py');
      expect(fallback.language).toBe('python');
      expect(fallback.functions.some((f) => f.functionName === 'bar')).toBe(true);
    } finally {
      process.env.PATH = origEpoch !== undefined ? origPath : origPath;
      if (origPathWin !== undefined) process.env.Path = origPathWin;
    }
  });
});
