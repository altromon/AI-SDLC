import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import {
  createDefaultDlpPolicy,
  loadDlpPolicy,
  parseDlpPolicy,
  sanitizeDlpPayload,
  sanitizeDlpText,
} from '../src/index.js';

describe('Deterministic DLP Pre-Prompt Sanitizer (#74)', () => {
  it('should redact private keys, API tokens, JWTs, credit cards, emails, and internal URLs', () => {
    const policy = createDefaultDlpPolicy();
    const beginPem = ['-----BEGIN RSA', ' PRIVATE KEY-----'].join('');
    const endPem = ['-----END RSA', ' PRIVATE KEY-----'].join('');
    const fakeGhp = ['ghp_', '1234567890abcdefghijklmnopqrstuvwxyzABCD'].join('');
    const fakeJwt = ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', 'eyJzdWIiOiIxMjM0NTY3ODkwIn0', 'dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'].join('.');
    const rawContext = [
      `${beginPem}\nMIIEowIBAAKCAQEA123456\n${endPem}`,
      `Token: ${fakeGhp}`,
      `JWT: ${fakeJwt}`,
      'Card: 4532-0151-1283-0366',
      'Contact: alice.smith@acme-enterprise.io (keep test@example.com intact)',
      'Internal API: https://vault.internal.acme.corp:8200/v1/secret',
    ].join('\n');

    const res = sanitizeDlpText(rawContext, policy);

    expect(res.redactionCount).toBe(6);
    expect(res.sanitizedText).toContain('[REDACTED:PRIVATE_KEY]');
    expect(res.sanitizedText).toContain('[REDACTED:API_TOKEN]');
    expect(res.sanitizedText).toContain('[REDACTED:JWT_TOKEN]');
    expect(res.sanitizedText).toContain('[REDACTED:CREDIT_CARD]');
    expect(res.sanitizedText).toContain('[REDACTED:EMAIL]');
    expect(res.sanitizedText).toContain('test@example.com');
    expect(res.sanitizedText).toContain('[REDACTED:INTERNAL_URL]');
    expect(res.triggeredRuleIds).toEqual([
      'DLP-001-PRIVATE-KEY',
      'DLP-002-API-TOKEN',
      'DLP-003-JWT',
      'DLP-004-CREDIT-CARD',
      'DLP-005-EMAIL',
      'DLP-006-INTERNAL-URL',
    ]);
  });

  it('should load custom dlp-policy.yaml and sanitize structured payloads', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-dlp-'));
    try {
      fs.writeFileSync(
        path.join(tmpDir, 'dlp-policy.yaml'),
        `version: "1.0"\nenabled: true\nrules:\n  - id: "DLP-CUSTOM-PROJECT"\n    description: "Mask codename"\n    pattern: "PROJECT_OMEGA"\n    replacement: "[REDACTED:CODENAME]"\n`
      );

      const loaded = loadDlpPolicy(tmpDir);
      expect(loaded.rules.length).toBe(1);

      const payload = {
        changeId: 'chg-001',
        notes: 'Deploying PROJECT_OMEGA to production',
      };
      const sanitized = sanitizeDlpPayload(payload, loaded);
      expect(sanitized.notes).toBe('Deploying [REDACTED:CODENAME] to production');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should bypass redaction when policy is disabled', () => {
    const policy = parseDlpPolicy('version: "1.0"\nenabled: false\n');
    const res = sanitizeDlpText('Contact: ceo@company.com', policy);
    expect(res.redactionCount).toBe(0);
    expect(res.sanitizedText).toBe('Contact: ceo@company.com');
  });
});
