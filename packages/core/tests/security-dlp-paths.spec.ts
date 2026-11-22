import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createDefaultDlpPolicy,
  loadDlpPolicy,
  parseDlpPolicy,
  sanitizeDlpPayload,
  sanitizeDlpText,
} from '../src/security/dlp-sanitizer.js';

describe('DLP Sanitizer: Happy / Sad / Boundary / Malformed Paths', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-dlp-paths-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('parseDlpPolicy', () => {
    it('returns default policy for empty or whitespace-only YAML (boundary)', () => {
      const p1 = parseDlpPolicy('');
      const p2 = parseDlpPolicy('   \n\t  ');
      expect(p1.enabled).toBe(true);
      expect(p1.rules.length).toBeGreaterThan(0);
      expect(p2.rules.length).toBe(p1.rules.length);
    });

    it('throws Fail-Closed error on malformed YAML syntax, array root, scalar root, or non-array rules (malformed)', () => {
      expect(() => parseDlpPolicy('rules: [unclosed')).toThrow('Invalid YAML in dlp-policy');
      expect(() => parseDlpPolicy('- item1\n- item2')).toThrow('root must be a YAML mapping');
      expect(() => parseDlpPolicy('"just a string"')).toThrow('root must be a YAML mapping');
      expect(() => parseDlpPolicy('version: "1.0"\nrules: "not-an-array"')).toThrow('rules must be an array');
    });

    it('skips rules without valid pattern and defaults missing optional rule fields (boundary/malformed)', () => {
      const yaml = `
rules:
  - id: INVALID-NO-PATTERN
  - pattern: ""
  - pattern: "SECRET_[0-9]+"
`;
      const policy = parseDlpPolicy(yaml);
      expect(policy.version).toBe('1.0');
      expect(policy.enabled).toBe(true);
      expect(policy.rules).toHaveLength(1);
      expect(policy.rules[0]).toMatchObject({
        id: 'DLP-CUSTOM-3',
        description: 'Custom DLP rule',
        pattern: 'SECRET_[0-9]+',
        replacement: '[REDACTED]',
        enabled: true,
      });
    });

    it('falls back to default rules when parsed rules array yields zero valid rules (boundary)', () => {
      const policy = parseDlpPolicy('version: "2.0"\nrules:\n  - id: NO_PAT\n');
      expect(policy.version).toBe('2.0');
      expect(policy.rules.length).toBe(createDefaultDlpPolicy().rules.length);
    });
  });

  describe('loadDlpPolicy', () => {
    it('falls back to default policy when dlp-policy.yaml does not exist (sad)', () => {
      const policy = loadDlpPolicy(tmpDir);
      expect(policy.enabled).toBe(true);
      expect(policy.rules.length).toBe(createDefaultDlpPolicy().rules.length);
    });

    it('loads custom policy from relative and absolute customPolicyPath (happy)', () => {
      const customRel = 'custom-dlp.yaml';
      const customAbs = path.join(tmpDir, customRel);
      fs.writeFileSync(customAbs, 'version: "3.0"\nenabled: false\n', 'utf-8');

      expect(loadDlpPolicy(tmpDir, customRel).version).toBe('3.0');
      expect(loadDlpPolicy(tmpDir, customAbs).enabled).toBe(false);
    });

    it('throws when dlp-policy.yaml on disk is malformed (malformed)', () => {
      fs.writeFileSync(path.join(tmpDir, 'dlp-policy.yaml'), 'rules: [broken', 'utf-8');
      expect(() => loadDlpPolicy(tmpDir)).toThrow('Invalid YAML in dlp-policy');
    });
  });

  describe('sanitizeDlpText & sanitizeDlpPayload', () => {
    it('handles empty text and disabled rules without redaction (boundary)', () => {
      const policy = parseDlpPolicy(`
rules:
  - id: DISABLED-RULE
    pattern: "SECRET"
    replacement: "[X]"
    enabled: false
  - id: BAD-REGEX
    pattern: "[unclosed("
    replacement: "[Y]"
`);
      expect(sanitizeDlpText('', policy)).toEqual({
        sanitizedText: '',
        redactionCount: 0,
        triggeredRuleIds: [],
      });
      expect(sanitizeDlpText('SECRET [unclosed(', policy)).toEqual({
        sanitizedText: 'SECRET [unclosed(',
        redactionCount: 0,
        triggeredRuleIds: [],
      });
    });

    it('handles null, undefined, string, and malformed JSON-breaking replacement in sanitizeDlpPayload (boundary/malformed)', () => {
      const defaultPolicy = createDefaultDlpPolicy();
      expect(sanitizeDlpPayload(null, defaultPolicy)).toBeNull();
      expect(sanitizeDlpPayload(undefined, defaultPolicy)).toBeUndefined();
      expect(sanitizeDlpPayload('user@acme.io', defaultPolicy)).toBe('[REDACTED:EMAIL]');

      const breakingPolicy = parseDlpPolicy(`
rules:
  - id: BREAK-JSON
    pattern: "foo"
    replacement: '"'
`);
      const original = { key: 'foo' };
      expect(sanitizeDlpPayload(original, breakingPolicy)).toEqual(original);
    });
  });
});
