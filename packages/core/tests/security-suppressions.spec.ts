import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  parseSecuritySuppression,
  generateSuppressionsAuditReport,
  scanFileForSast,
  verifySast,
  verifySecrets,
  scanContentForSecrets,
} from '../src/index.js';

describe('Security Suppressions Audit and Expiration Suite (#67 / CHG-038)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-suppression-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('parseSecuritySuppression', () => {
    it('should parse a valid active SAST suppression with all required attributes', () => {
      const line = 'const res = await db.query(sql); // ai-sdlc:allow-sast rule="SAST-001" reason="Sanitizado en capa previa por ORM" expires="2099-12-31" approved-by="ciso@empresa.com"';
      const parsed = parseSecuritySuppression(line, 'src/db.ts', 42);

      expect(parsed).not.toBeNull();
      expect(parsed?.kind).toBe('sast');
      expect(parsed?.ruleId).toBe('SAST-001');
      expect(parsed?.reason).toBe('Sanitizado en capa previa por ORM');
      expect(parsed?.expires).toBe('2099-12-31');
      expect(parsed?.approvedBy).toBe('ciso@empresa.com');
      expect(parsed?.status).toBe('active');
    });

    it('should parse a valid active Secret suppression with single or double quotes', () => {
      const line = "const token = 'ghp_dummy123456789012345678901234567890'; // ai-sdlc:allow-secret rule='SEC-001' reason='Test fixture' expires='2099-01-01' approved-by='sec-lead@empresa.com'";
      const parsed = parseSecuritySuppression(line, 'tests/fixtures.ts', 10);

      expect(parsed).not.toBeNull();
      expect(parsed?.kind).toBe('secret');
      expect(parsed?.ruleId).toBe('SEC-001');
      expect(parsed?.status).toBe('active');
    });

    it('should flag suppression as expired when expires date is in the past', () => {
      const line = 'eval(userInput); // ai-sdlc:allow-sast rule="SAST-002" reason="Legacy eval" expires="2020-01-01" approved-by="dev@empresa.com"';
      const parsed = parseSecuritySuppression(line, 'src/legacy.ts', 15);

      expect(parsed).not.toBeNull();
      expect(parsed?.status).toBe('expired');
    });

    it('should flag suppression as invalid when missing required fields (e.g. approved-by)', () => {
      const line = 'eval(userInput); // ai-sdlc:allow-sast rule="SAST-002" reason="Legacy eval" expires="2099-01-01"';
      const parsed = parseSecuritySuppression(line, 'src/legacy.ts', 15);

      expect(parsed).not.toBeNull();
      expect(parsed?.status).toBe('invalid');
      expect(parsed?.invalidReason).toMatch(/approved-by/i);
    });

    it('should flag bare legacy suppression comment (ai-sdlc:allow-sast without attributes) as invalid', () => {
      const line = 'eval(userInput); // ai-sdlc:allow-sast';
      const parsed = parseSecuritySuppression(line, 'src/legacy.ts', 15);

      expect(parsed).not.toBeNull();
      expect(parsed?.status).toBe('invalid');
    });

    it('should flag informal nosec comments as invalid suppressions', () => {
      const line = 'eval(userInput); // nosec';
      const parsed = parseSecuritySuppression(line, 'src/legacy.ts', 15);

      expect(parsed).not.toBeNull();
      expect(parsed?.status).toBe('invalid');
    });
  });

  describe('SAST Engine Integration', () => {
    it('should suppress SAST violation when suppression is valid and active', () => {
      const file = path.join(tempDir, 'active-suppressed.ts');
      fs.writeFileSync(
        file,
        'const res = await db.query(`SELECT * FROM users WHERE id = ${userId}`); // ai-sdlc:allow-sast rule="SAST-001-SQL-INJECTION" reason="Sanitizado" expires="2099-12-31" approved-by="ciso@empresa.com"\n'
      );

      const findings = scanFileForSast(file, tempDir);
      expect(findings.length).toBe(0);
    });

    it('should NOT suppress SAST violation when suppression is expired and block verifySast', () => {
      const file = path.join(tempDir, 'expired-suppressed.ts');
      fs.writeFileSync(
        file,
        'const res = await db.query(`SELECT * FROM users WHERE id = ${userId}`); // ai-sdlc:allow-sast rule="SAST-001-SQL-INJECTION" reason="Sanitizado" expires="2020-01-01" approved-by="ciso@empresa.com"\n'
      );

      const findings = scanFileForSast(file, tempDir);
      expect(findings.length).toBeGreaterThan(0);

      const result = verifySast({ rootDir: tempDir, targetDirectories: ['.'] });
      expect(result.success).toBe(false);
      expect(result.suppressions?.some((s) => s.status === 'expired')).toBe(true);
    });

    it('should NOT suppress SAST violation when suppression is invalid (missing fields)', () => {
      const file = path.join(tempDir, 'invalid-suppressed.ts');
      fs.writeFileSync(
        file,
        'const res = await db.query(`SELECT * FROM users WHERE id = ${userId}`); // ai-sdlc:allow-sast\n'
      );

      const findings = scanFileForSast(file, tempDir);
      expect(findings.length).toBeGreaterThan(0);
    });
  });

  describe('Secrets Engine Integration', () => {
    const fakeSecret = 'ghp_' + 'A'.repeat(36);

    it('should suppress secret finding when suppression is valid and active', () => {
      const snippet = `const apiKey = "${fakeSecret}"; // ai-sdlc:allow-secret rule="SEC-001-GITHUB-PAT" reason="Mock fixture" expires="2099-12-31" approved-by="lead@corp.com"\n`;
      const findings = scanContentForSecrets(snippet, 'test.ts', tempDir);
      expect(findings.length).toBe(0);
    });

    it('should NOT suppress secret finding when suppression is expired', () => {
      const snippet = `const apiKey = "${fakeSecret}"; // ai-sdlc:allow-secret rule="SEC-001-GITHUB-PAT" reason="Mock fixture" expires="2021-01-01" approved-by="lead@corp.com"\n`;
      const findings = scanContentForSecrets(snippet, 'test.ts', tempDir);
      expect(findings.length).toBeGreaterThan(0);
    });

    it('should NOT suppress secret finding with bare legacy suppression', () => {
      const snippet = `const apiKey = "${fakeSecret}"; // ai-sdlc:allow-secret\n`;
      const findings = scanContentForSecrets(snippet, 'test.ts', tempDir);
      expect(findings.length).toBeGreaterThan(0);
    });
  });

  describe('generateSuppressionsAuditReport', () => {
    it('should generate markdown report containing active, expired, and invalid tables', () => {
      const report = generateSuppressionsAuditReport([
        {
          kind: 'sast',
          ruleId: 'SAST-001',
          reason: 'ORM sanitize',
          expires: '2099-12-31',
          approvedBy: 'ciso@corp.com',
          status: 'active',
          filePath: 'src/repo.ts',
          lineNumber: 42,
          rawComment: '// ai-sdlc:allow-sast ...',
        },
        {
          kind: 'secret',
          ruleId: 'SEC-001',
          reason: 'Old test fixture',
          expires: '2020-01-01',
          approvedBy: 'dev@corp.com',
          status: 'expired',
          filePath: 'tests/fixture.ts',
          lineNumber: 12,
          rawComment: '// ai-sdlc:allow-secret ...',
        },
      ]);

      expect(report).toContain('# 📋 Security Suppressions and Audit Exceptions Inventory');
      expect(report).toContain('SAST-001');
      expect(report).toContain('2099-12-31');
      expect(report).toContain('ciso@corp.com');
      expect(report).toContain('Expired');
    });
  });
});
