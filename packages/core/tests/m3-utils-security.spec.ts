/**
 * Unit Tests for Core Utils FS & Security DLP Internal Helpers (M3.1)
 * Cites: FR-044-REPRODUCIBILITY-CANONICAL-ORDERING-001, FR-047-MCP-SERVER-HARDENING-DLP-001, SEC-REQ-001
 * Tag: @FR-044-REPRODUCIBILITY-CANONICAL-ORDERING-001 @FR-047-MCP-SERVER-HARDENING-DLP-001
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  areCycloneDxSbomsEqual,
  areSarifReportsEqual,
  atomicWriteFile,
  isPlainJsonObject,
  writeReportFileIfChanged,
} from '../src/utils/fs.js';
import {
  applySingleDlpRule,
  createDefaultDlpPolicy,
  normalizeParsedRule,
  parseDlpDoc,
  parseDlpPolicy,
  sanitizeDlpPayload,
  sanitizeDlpText,
  sanitizeDlpValue,
  sanitizePlainDlpObject,
  type DlpRule,
} from '../src/security/dlp-sanitizer.js';

describe('Core Utils FS Internal Helpers (M3.1)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-m3-utils-sec-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  describe('isPlainJsonObject', () => {
    it('returns true for plain and nested objects and false for null, primitives, and arrays', () => {
      expect(isPlainJsonObject({})).toBe(true);
      expect(isPlainJsonObject({ a: 1 })).toBe(true);
      expect(isPlainJsonObject(Object.create(null))).toBe(true);

      const nested = { nested: { key: 'val' }, items: [1, 2] };
      expect(isPlainJsonObject(nested)).toBe(true);
      expect(isPlainJsonObject(nested.nested)).toBe(true);
      expect(isPlainJsonObject(nested.items)).toBe(false);

      expect(isPlainJsonObject(null)).toBe(false);
      expect(isPlainJsonObject(undefined)).toBe(false);
      expect(isPlainJsonObject(123)).toBe(false);
      expect(isPlainJsonObject(0)).toBe(false);
      expect(isPlainJsonObject('text')).toBe(false);
      expect(isPlainJsonObject('')).toBe(false);
      expect(isPlainJsonObject(true)).toBe(false);
      expect(isPlainJsonObject(false)).toBe(false);
      expect(isPlainJsonObject([])).toBe(false);
      expect(isPlainJsonObject([1, 2])).toBe(false);

      class CustomBox {
        value = 1;
      }
      expect(isPlainJsonObject(new Date())).toBe(false);
      expect(isPlainJsonObject(/abc/)).toBe(false);
      expect(isPlainJsonObject(new Map())).toBe(false);
      expect(isPlainJsonObject(new Set())).toBe(false);
      expect(isPlainJsonObject(new CustomBox())).toBe(false);
    });
  });

  describe('areCycloneDxSbomsEqual', () => {
    it('returns true when serialNumber, components, and vulnerabilities match despite volatile metadata', () => {
      const existing = JSON.stringify({
        bomFormat: 'CycloneDX',
        serialNumber: 'urn:uuid:11111111-1111-4111-8111-111111111111',
        metadata: { timestamp: '2026-01-01T00:00:00Z' },
        components: [{ name: 'pkg-a', version: '1.0.0' }],
        vulnerabilities: [{ id: 'CVE-2026-0001' }],
      });
      const updated = JSON.stringify({
        bomFormat: 'CycloneDX',
        serialNumber: 'urn:uuid:11111111-1111-4111-8111-111111111111',
        metadata: { timestamp: '2026-11-22T00:00:00Z' },
        components: [{ name: 'pkg-a', version: '1.0.0' }],
        vulnerabilities: [{ id: 'CVE-2026-0001' }],
      });

      expect(areCycloneDxSbomsEqual(existing, updated)).toBe(true);
    });

    it('handles omitted vs empty vulnerabilities and components boundaries', () => {
      const noVulns = JSON.stringify({ serialNumber: 'urn:uuid:1', components: [] });
      const emptyVulns = JSON.stringify({ serialNumber: 'urn:uuid:1', components: [], vulnerabilities: [] });
      expect(areCycloneDxSbomsEqual(noVulns, emptyVulns)).toBe(true);

      const noComponents = JSON.stringify({ serialNumber: 'urn:uuid:1' });
      expect(areCycloneDxSbomsEqual(noComponents, emptyVulns)).toBe(false);

      const diffSerial = JSON.stringify({ serialNumber: 'urn:uuid:2', components: [] });
      expect(areCycloneDxSbomsEqual(noVulns, diffSerial)).toBe(false);

      expect(areCycloneDxSbomsEqual('{}', '{}')).toBe(true);
    });

    it('returns false for differing vulnerabilities or non-empty components arrays', () => {
      const base = {
        serialNumber: 'urn:uuid:1',
        components: [{ name: 'pkg-a', version: '1.0.0' }],
        vulnerabilities: [{ id: 'CVE-2026-0001' }],
      };
      const diffVulns = {
        ...base,
        vulnerabilities: [{ id: 'CVE-2026-0002' }],
      };
      const diffComponents = {
        ...base,
        components: [{ name: 'pkg-a', version: '2.0.0' }],
      };

      expect(areCycloneDxSbomsEqual(JSON.stringify(base), JSON.stringify(diffVulns))).toBe(false);
      expect(areCycloneDxSbomsEqual(JSON.stringify(base), JSON.stringify(diffComponents))).toBe(false);
    });

    it('returns false for malformed JSON, empty strings, JSON null, primitives, and arrays, and repairs corrupt files via writeReportFileIfChanged', () => {
      const valid = JSON.stringify({ bomFormat: 'CycloneDX', serialNumber: 'urn:uuid:1', components: [], vulnerabilities: [] });
      expect(areCycloneDxSbomsEqual('{not-json', valid)).toBe(false);
      expect(areCycloneDxSbomsEqual(valid, '{not-json')).toBe(false);
      expect(areCycloneDxSbomsEqual('', valid)).toBe(false);
      expect(areCycloneDxSbomsEqual('null', valid)).toBe(false);
      expect(areCycloneDxSbomsEqual('123', '456')).toBe(false);
      expect(areCycloneDxSbomsEqual('[1]', '[2]')).toBe(false);
      expect(areCycloneDxSbomsEqual('true', 'false')).toBe(false);
      expect(areCycloneDxSbomsEqual('123', valid)).toBe(false);
      expect(areCycloneDxSbomsEqual('[]', valid)).toBe(false);

      const cdxPath = path.join(tmpDir, 'report.cdx.json');
      fs.writeFileSync(cdxPath, '[]', 'utf-8');
      expect(writeReportFileIfChanged(cdxPath, valid)).toBe(true);
      expect(fs.readFileSync(cdxPath, 'utf-8')).toBe(valid);
      expect(writeReportFileIfChanged(cdxPath, valid)).toBe(false);
    });
  });

  describe('areSarifReportsEqual', () => {
    it('returns true when runs[0].results match despite differing invocations or tool metadata', () => {
      const sarifA = JSON.stringify({
        version: '2.1.0',
        runs: [{ tool: { driver: { name: 'scanner-v1' } }, invocations: [{ startTimeUtc: '2026-01-01' }], results: [{ ruleId: 'R-01' }] }],
      });
      const sarifB = JSON.stringify({
        version: '2.1.0',
        runs: [{ tool: { driver: { name: 'scanner-v2' } }, invocations: [{ startTimeUtc: '2026-02-02' }], results: [{ ruleId: 'R-01' }] }],
      });

      expect(areSarifReportsEqual(sarifA, sarifB)).toBe(true);
    });

    it('returns false when runs[0].results differ and handles empty/missing runs boundaries', () => {
      const sarifA = JSON.stringify({ runs: [{ results: [{ ruleId: 'R-01' }] }] });
      const sarifB = JSON.stringify({ runs: [{ results: [{ ruleId: 'R-02' }] }] });
      expect(areSarifReportsEqual(sarifA, sarifB)).toBe(false);

      const missingRuns = JSON.stringify({});
      const emptyRuns = JSON.stringify({ runs: [] });
      const emptyResults = JSON.stringify({ runs: [{ results: [] }] });
      expect(areSarifReportsEqual(missingRuns, emptyRuns)).toBe(true);
      expect(areSarifReportsEqual(emptyRuns, emptyResults)).toBe(true);
    });

    it('returns false for malformed JSON, empty input, JSON null, primitives, and arrays, and repairs corrupt files via writeReportFileIfChanged', () => {
      const valid = JSON.stringify({ version: '2.1.0', runs: [{ results: [] }] });
      expect(areSarifReportsEqual('invalid-json', valid)).toBe(false);
      expect(areSarifReportsEqual(valid, '')).toBe(false);
      expect(areSarifReportsEqual('null', valid)).toBe(false);
      expect(areSarifReportsEqual('123', '456')).toBe(false);
      expect(areSarifReportsEqual('[1]', '[2]')).toBe(false);
      expect(areSarifReportsEqual('true', 'false')).toBe(false);
      expect(areSarifReportsEqual('"str"', '"str"')).toBe(false);
      expect(areSarifReportsEqual('123', valid)).toBe(false);
      expect(areSarifReportsEqual('[1]', valid)).toBe(false);

      const sarifPath = path.join(tmpDir, 'scan.sarif');
      fs.writeFileSync(sarifPath, '123', 'utf-8');
      expect(writeReportFileIfChanged(sarifPath, valid)).toBe(true);
      expect(fs.readFileSync(sarifPath, 'utf-8')).toBe(valid);
      expect(writeReportFileIfChanged(sarifPath, valid)).toBe(false);
    });
  });

  describe('atomicWriteFile', () => {
    it('creates a new file and overwrites an existing file with zero leftover .tmp files', () => {
      const target = path.join(tmpDir, 'report.md');
      atomicWriteFile(target, 'first content');
      expect(fs.readFileSync(target, 'utf-8')).toBe('first content');
      expect(fs.readdirSync(tmpDir).filter((f) => f.endsWith('.tmp'))).toEqual([]);

      atomicWriteFile(target, 'updated content');
      expect(fs.readFileSync(target, 'utf-8')).toBe('updated content');
      expect(fs.readdirSync(tmpDir).filter((f) => f.endsWith('.tmp'))).toEqual([]);
    });

    it('preserves empty string and multi-line Unicode content', () => {
      const emptyTarget = path.join(tmpDir, 'empty.txt');
      atomicWriteFile(emptyTarget, '');
      expect(fs.readFileSync(emptyTarget, 'utf-8')).toBe('');

      const unicodeTarget = path.join(tmpDir, 'unicode.txt');
      const payload = 'áéíóú ñ\nline-2 ✓';
      atomicWriteFile(unicodeTarget, payload);
      expect(fs.readFileSync(unicodeTarget, 'utf-8')).toBe(payload);
    });

    it('throws on missing parent directory or directory target without leaving orphaned .tmp files (R4 regression)', () => {
      const missingParentTarget = path.join(tmpDir, 'missing-dir', 'out.txt');
      expect(() => atomicWriteFile(missingParentTarget, 'data')).toThrow();

      const subDirTarget = path.join(tmpDir, 'existing-subdir');
      fs.mkdirSync(subDirTarget);
      expect(() => atomicWriteFile(subDirTarget, 'data')).toThrow();
      const leftovers = fs.readdirSync(tmpDir).filter((name) => name.endsWith('.tmp'));
      expect(leftovers).toEqual([]);
    });
  });
});

describe('Security DLP Sanitizer Internal Helpers (M3.1)', () => {
  describe('normalizeParsedRule', () => {
    it('preserves valid explicit rule fields including enabled=false and empty replacement', () => {
      const rule = normalizeParsedRule(
        {
          id: 'CUSTOM-99',
          description: 'Mask internal tag',
          pattern: 'TAG_[0-9]+',
          replacement: '',
          enabled: false,
        },
        4
      );

      expect(rule).toEqual({
        id: 'CUSTOM-99',
        description: 'Mask internal tag',
        pattern: 'TAG_[0-9]+',
        replacement: '',
        enabled: false,
      });
    });

    it('applies defaults for missing or non-string optional fields', () => {
      const rule = normalizeParsedRule(
        {
          id: 42,
          description: null,
          pattern: 'CODENAME_[A-Z]+',
          replacement: 123,
        },
        2
      );

      expect(rule).toEqual({
        id: 'DLP-CUSTOM-3',
        description: 'Custom DLP rule',
        pattern: 'CODENAME_[A-Z]+',
        replacement: '[REDACTED]',
        enabled: true,
      });
    });

    it('returns null safely on missing/empty/non-string pattern and null/primitive/array inputs (R4 regression)', () => {
      expect(normalizeParsedRule({}, 0)).toBeNull();
      expect(normalizeParsedRule({ pattern: '' }, 0)).toBeNull();
      expect(normalizeParsedRule({ pattern: 123 }, 0)).toBeNull();
      expect(normalizeParsedRule(null, 0)).toBeNull();
      expect(normalizeParsedRule(undefined, 0)).toBeNull();
      expect(normalizeParsedRule('not-an-object', 0)).toBeNull();
      expect(normalizeParsedRule(['pattern'], 0)).toBeNull();

      const policy = parseDlpPolicy('version: "1.0"\nrules:\n  -\n  - pattern: "CODENAME_[0-9]+"\n');
      expect(policy.rules).toHaveLength(1);
      expect(policy.rules[0].pattern).toBe('CODENAME_[0-9]+');
    });
  });

  describe('parseDlpDoc', () => {
    it('parses valid YAML mapping with rules, empty rules, or omitted rules', () => {
      const withRules = parseDlpDoc('version: "2.0"\nenabled: true\nrules:\n  - pattern: "REF_[0-9]+"\n');
      expect(withRules.version).toBe('2.0');
      expect(Array.isArray(withRules.rules)).toBe(true);

      const emptyRules = parseDlpDoc('version: "1.0"\nrules: []\n');
      expect(emptyRules.rules).toEqual([]);

      const noRules = parseDlpDoc('enabled: false\n');
      expect(noRules.enabled).toBe(false);
    });

    it('throws fail-closed errors on invalid YAML syntax, non-mapping roots, and non-array rules', () => {
      expect(() => parseDlpDoc('rules: [unclosed')).toThrow(/Invalid YAML in dlp-policy/);
      expect(() => parseDlpDoc('')).toThrow(/root must be a YAML mapping/);
      expect(() => parseDlpDoc('# comment only\n')).toThrow(/root must be a YAML mapping/);
      expect(() => parseDlpDoc('null')).toThrow(/root must be a YAML mapping/);
      expect(() => parseDlpDoc('- item1\n- item2\n')).toThrow(/root must be a YAML mapping/);
      expect(() => parseDlpDoc('"scalar string"')).toThrow(/root must be a YAML mapping/);
      expect(() => parseDlpDoc('rules: "invalid"\n')).toThrow(/rules must be an array/);
      expect(() => parseDlpDoc('rules: {}\n')).toThrow(/rules must be an array/);
      expect(() => parseDlpDoc('rules: null\n')).toThrow(/rules must be an array/);
    });
  });

  describe('applySingleDlpRule', () => {
    const sampleRule: DlpRule = {
      id: 'DLP-CODENAME',
      description: 'Mask internal codenames',
      pattern: 'CODENAME_[0-9]+',
      replacement: '[MASKED]',
      enabled: true,
    };

    it('replaces all matches and counts redactions accurately', () => {
      const res = applySingleDlpRule('Init CODENAME_10 then CODENAME_25.', sampleRule);
      expect(res).toEqual({
        output: 'Init [MASKED] then [MASKED].',
        matches: 2,
      });
    });

    it('short-circuits when disabled and returns unchanged output when no matches occur', () => {
      const disabledRule: DlpRule = { ...sampleRule, enabled: false };
      expect(applySingleDlpRule('CODENAME_10', disabledRule)).toEqual({
        output: 'CODENAME_10',
        matches: 0,
      });
      expect(applySingleDlpRule('clean text', sampleRule)).toEqual({
        output: 'clean text',
        matches: 0,
      });
    });

    it('handles empty text, undefined enabled flag, and literal $ replacement tokens without expansion', () => {
      expect(applySingleDlpRule('', sampleRule)).toEqual({ output: '', matches: 0 });

      const implicitEnabledRule: DlpRule = {
        id: 'DLP-DOLLAR',
        description: 'Literal replacement check',
        pattern: 'INTERNAL_REF_[A-Z]+',
        replacement: '$&$1$$[SAFE]',
      };
      const res = applySingleDlpRule('See INTERNAL_REF_ALPHA now', implicitEnabledRule);
      expect(res).toEqual({
        output: 'See $&$1$$[SAFE] now',
        matches: 1,
      });
    });

    it('fails safe and returns original text with 0 matches on malformed regex pattern', () => {
      const brokenRule: DlpRule = {
        ...sampleRule,
        pattern: '[unclosed(',
      };
      expect(applySingleDlpRule('CODENAME_10', brokenRule)).toEqual({
        output: 'CODENAME_10',
        matches: 0,
      });
    });
  });

  describe('sanitizePlainDlpObject, sanitizeDlpValue & sanitizeDlpPayload (R4 regression)', () => {
    it('sanitizePlainDlpObject traverses plain and null-prototype objects, skips mutation, and handles circular links', () => {
      const policy = createDefaultDlpPolicy();
      const nullProto = Object.create(null) as Record<string, unknown>;
      nullProto.contact = 'alice@acme-corp.io';
      nullProto.count = 3;

      const sanitizedNull = sanitizePlainDlpObject(nullProto, policy, new WeakMap<object, unknown>());
      expect(Object.getPrototypeOf(sanitizedNull)).toBeNull();
      expect(sanitizedNull.contact).toBe('[REDACTED:EMAIL]');
      expect(sanitizedNull.count).toBe(3);
      expect(nullProto.contact).toBe('alice@acme-corp.io');

      const circular: Record<string, unknown> = { email: 'bob@acme-corp.io' };
      circular.self = circular;
      const sanitizedCirc = sanitizePlainDlpObject(circular, policy, new WeakMap<object, unknown>());
      expect(sanitizedCirc.email).toBe('[REDACTED:EMAIL]');
      expect(sanitizedCirc.self).toBe(sanitizedCirc);
    });

    it('sanitizeDlpValue handles primitives, arrays, circular arrays, and preserves non-plain objects', () => {
      const policy = createDefaultDlpPolicy();
      const seen = new WeakMap<object, unknown>();
      const when = new Date('2026-11-23T00:00:00Z');
      const mapVal = new Map<string, string>([['k', 'v']]);

      expect(sanitizeDlpValue('bob@acme-corp.io', policy, seen)).toBe('[REDACTED:EMAIL]');
      expect(sanitizeDlpValue(42, policy, seen)).toBe(42);
      expect(sanitizeDlpValue(false, policy, seen)).toBe(false);
      expect(sanitizeDlpValue(null, policy, seen)).toBeNull();
      expect(sanitizeDlpValue(undefined, policy, seen)).toBeUndefined();
      expect(sanitizeDlpValue(when, policy, seen)).toBe(when);
      expect(sanitizeDlpValue(mapVal, policy, seen)).toBe(mapVal);

      const circArr: unknown[] = ['alice@acme-corp.io'];
      circArr.push(circArr);
      const sanitizedArr = sanitizeDlpValue(circArr, policy, new WeakMap<object, unknown>()) as unknown[];
      expect(sanitizedArr[0]).toBe('[REDACTED:EMAIL]');
      expect(sanitizedArr[1]).toBe(sanitizedArr);
    });

    it('sanitizeDlpPayload does not fail open on cross-key PEM spans, greedy wildcards, or quote-containing replacements', () => {
      const defaultPolicy = createDefaultDlpPolicy();
      const beginPem = ['-----BEGIN ', 'PRIVATE KEY-----'].join('');
      const endPem = ['-----END ', 'PRIVATE KEY-----'].join('');
      const fakeGhp = ['ghp_', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcd'].join('');

      const crossKeyPayload = {
        header: beginPem,
        body: 'MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSk',
        tail: [endPem],
        nested: {
          token: fakeGhp,
          pem: `${beginPem}\nMIIEowIBAAKCAQEA\n${endPem}`,
          items: ['alice@acme-corp.io', 99, null],
        },
      };
      const sanitizedCross = sanitizeDlpPayload(crossKeyPayload, defaultPolicy);
      expect(sanitizedCross.header).toBe(beginPem);
      expect(sanitizedCross.tail).toEqual([endPem]);
      expect(sanitizedCross.nested.token).toBe('[REDACTED:API_TOKEN]');
      expect(sanitizedCross.nested.pem).toBe('[REDACTED:PRIVATE_KEY]');
      expect(sanitizedCross.nested.items).toEqual(['[REDACTED:EMAIL]', 99, null]);
      expect(crossKeyPayload.nested.token).toBe(fakeGhp);

      const greedyPolicy = parseDlpPolicy(`
version: "1.0"
enabled: true
rules:
  - id: GREEDY-SECRET
    description: "Greedy wildcard rule"
    pattern: "SECRET_.*"
    replacement: "[REDACTED]"
`);
      expect(sanitizeDlpPayload({ a: 'SECRET_12345', b: 'keep' }, greedyPolicy)).toEqual({
        a: '[REDACTED]',
        b: 'keep',
      });
      expect(sanitizeDlpText('SECRET_12345', greedyPolicy)).toEqual({
        sanitizedText: '[REDACTED]',
        redactionCount: 1,
        triggeredRuleIds: ['GREEDY-SECRET'],
      });

      const quotePolicy = parseDlpPolicy(`
version: "1.0"
enabled: true
rules:
  - id: QUOTE-REPL
    description: "Replacement containing quotes"
    pattern: "ghp_[A-Za-z0-9_]{36,255}"
    replacement: '"INJECTED"'
`);
      expect(sanitizeDlpPayload({ secret: fakeGhp, safe: 'ok' }, quotePolicy)).toEqual({
        secret: '"INJECTED"',
        safe: 'ok',
      });
      expect(sanitizeDlpText(fakeGhp, quotePolicy)).toEqual({
        sanitizedText: '"INJECTED"',
        redactionCount: 1,
        triggeredRuleIds: ['QUOTE-REPL'],
      });
    });

    it('sanitizeDlpPayload handles nested circular objects and disabled policies safely', () => {
      const defaultPolicy = createDefaultDlpPolicy();
      const root: { user: string; child?: unknown } = { user: 'sec@acme-corp.io' };
      root.child = [root];

      const sanitized = sanitizeDlpPayload(root, defaultPolicy);
      expect(sanitized.user).toBe('[REDACTED:EMAIL]');
      expect((sanitized.child as unknown[])[0]).toBe(sanitized);

      const disabled = parseDlpPolicy('version: "1.0"\nenabled: false\n');
      expect(sanitizeDlpPayload({ user: 'sec@acme-corp.io' }, disabled)).toEqual({ user: 'sec@acme-corp.io' });
    });
  });
});
