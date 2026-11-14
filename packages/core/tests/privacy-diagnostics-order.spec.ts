import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_PRIVACY_POLICY,
  deduplicateAndSortPrivacyViolations,
  scanFileForPrivacyViolations,
  verifyPrivacy,
  type PrivacyViolation,
} from '../src/index.js';

describe('TSK-003: Redacted diagnostics, deduplication & canonical ordering', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-privacy-diag-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('redacts or omits snippet for PRIV-001 and PRIV-004 and never leaks host rootDir in message', () => {
    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    const file = path.join(srcDir, 'leak.ts');

    const secretSsn = ['123', '45', '6789'].join('-');
    fs.writeFileSync(
      file,
      [
        'console.info("User email:", user.email);',
        `const ssn = "${secretSsn}";`,
      ].join('\n'),
      'utf-8'
    );

    const violations = scanFileForPrivacyViolations(file, tempDir, DEFAULT_PRIVACY_POLICY);
    const priv001 = violations.find((v) => v.ruleId === 'PRIV-001-PII-IN-LOGS');
    const priv004 = violations.find((v) => v.ruleId === 'PRIV-004-HARDCODED-REAL-PII');

    expect(priv001).toBeDefined();
    expect(priv004).toBeDefined();

    for (const v of [priv001!, priv004!]) {
      expect(v.snippet === undefined || v.snippet === '[REDACTED]').toBe(true);
      expect(v.message).not.toContain(tempDir);
      expect(v.message).not.toContain(secretSsn);
    }
  });

  it('deduplicates violations by (relPath, lineNumber, ruleId) and sorts canonically in verifyPrivacy', () => {
    const assetsDir = path.join(tempDir, 'specs', 'privacy', 'assets');
    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.mkdirSync(srcDir, { recursive: true });

    fs.writeFileSync(
      path.join(assetsDir, 'DATA-ASSET-USER-001.md'),
      `---
id: DATA-ASSET-USER-001
type: data-asset
title: User PII
status: active
version: 1.0.0
classification: confidential-pii
pii-categories:
  - email
  - phone
data-subjects:
  - User
retention-period: P1Y
erasure-method: delete
fields:
  - name: email
    sensitivity: pii
  - name: phone_number
    sensitivity: pii
---
# User PII
`,
      'utf-8'
    );

    // z.py has an offending call on line 2 (both static 'email' and dynamic 'email' + 'phone_number' on same line -> deduplicated to 1)
    fs.writeFileSync(
      path.join(srcDir, 'z.py'),
      [
        'def log_it(user):',
        '    logging.info("u=%s p=%s", user.email, user.phone_number)',
      ].join('\n'),
      'utf-8'
    );

    // a.go has offending calls on lines 3 and 2 (verify lineNumber ascending within same file, and a.go before z.py)
    fs.writeFileSync(
      path.join(srcDir, 'a.go'),
      [
        'package main',
        'slog.Info("first", "email", user.Email)',
        'slog.Info("second", "phone", user.PhoneNumber)',
      ].join('\n'),
      'utf-8'
    );

    const result = verifyPrivacy({ rootDir: tempDir });
    const logViolations = result.violations.filter((v) => v.ruleId === 'PRIV-001-PII-IN-LOGS');

    expect(logViolations.map((v) => `${v.relPath}:${v.lineNumber}:${v.ruleId}`)).toEqual([
      'src/a.go:2:PRIV-001-PII-IN-LOGS',
      'src/a.go:3:PRIV-001-PII-IN-LOGS',
      'src/z.py:2:PRIV-001-PII-IN-LOGS',
    ]);

    expect(result.reportMarkdown).not.toContain(tempDir);
    expect(result.reportMarkdown).not.toContain('user.email');
  });

  it('sorts lineNumber: undefined before defined lineNumbers and orders distinct ruleIds on the same line', () => {
    const base: Omit<PrivacyViolation, 'lineNumber' | 'ruleId'> = {
      type: 'PII_IN_LOGS',
      severity: 'HIGH',
      filePath: '/repo/src/a.ts',
      relPath: 'src/a.ts',
      snippet: '[REDACTED]',
      message: 'msg',
    };

    const sorted = deduplicateAndSortPrivacyViolations([
      { ...base, lineNumber: 5, ruleId: 'PRIV-002-PII-IN-LLM-PROMPT' },
      { ...base, lineNumber: 5, ruleId: 'PRIV-001-PII-IN-LOGS' },
      { ...base, lineNumber: undefined, ruleId: 'PRIV-004-HARDCODED-REAL-PII' },
      { ...base, lineNumber: undefined, ruleId: 'PRIV-001-PII-IN-LOGS' },
    ]);

    expect(sorted.map((v) => `${v.lineNumber ?? 'none'}:${v.ruleId}`)).toEqual([
      'none:PRIV-001-PII-IN-LOGS',
      'none:PRIV-004-HARDCODED-REAL-PII',
      '5:PRIV-001-PII-IN-LOGS',
      '5:PRIV-002-PII-IN-LLM-PROMPT',
    ]);
  });
});
