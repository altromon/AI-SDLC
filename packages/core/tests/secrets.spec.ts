import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import {
  calculateShannonEntropy,
  maskSecret,
  scanContentForSecrets,
  verifySecrets,
} from '../src/verifiers/secrets.js';

describe('Deterministic Secret Scanning & Gitleaks Gate (@ai-sdlc/core)', () => {
  it('should calculate Shannon entropy accurately', () => {
    // Monotonous repeated string has 0 entropy
    expect(calculateShannonEntropy('aaaaaaaaaaaaaaaa')).toBe(0);
    // Simple repetitive string has low entropy
    const lowEntropy = calculateShannonEntropy('abcabcabcabcabc');
    expect(lowEntropy).toBeLessThan(2.0);
    // Cryptographic base64 random token has high entropy
    const highEntropy = calculateShannonEntropy('gH8#mK2$pL0@vN4!wZ7&qX9*rT1%yU3^');
    expect(highEntropy).toBeGreaterThan(4.5);
  });

  it('should mask secret tokens securely for display and logging', () => {
    const masked = maskSecret('ghp_1234567890abcdef1234567890abcdef1234');
    expect(masked.startsWith('ghp_12')).toBe(true);
    expect(masked.endsWith('1234')).toBe(true);
    expect(masked.includes('****')).toBe(true);
    expect(masked).not.toContain('abcdef1234567890abcdef');
  });

  it('should detect private key PEM blocks', () => {
    const snippet = `
const cert = "-----BEGIN RSA PRIVATE KEY-----\\nMIIEowIBAAKCAQEA0Y8...";
`;
    const violations = scanContentForSecrets(snippet, 'config.ts', process.cwd());
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].type).toBe('PRIVATE_KEY');
    expect(violations[0].ruleId).toBe('SEC-001-PRIVATE-KEY');
  });

  it('should detect AWS access key IDs', () => {
    const fakeKey = ['AKIA', 'IOSFODNN7EXAMPLE'].join('');
    const snippet = `const awsKey = "${fakeKey}";`;
    const violations = scanContentForSecrets(snippet, 'aws.ts', process.cwd());
    expect(violations.length).toBe(1);
    expect(violations[0].type).toBe('AWS_CREDENTIAL');
    expect(violations[0].ruleId).toBe('SEC-002-AWS-ACCESS-KEY');
  });

  it('should detect GitHub personal access tokens', () => {
    const fakeToken = ['ghp_', '123456789012345678901234567890123456'].join('');
    const snippet = `const ghToken = "${fakeToken}";`;
    const violations = scanContentForSecrets(snippet, 'github.ts', process.cwd());
    expect(violations.length).toBe(1);
    expect(violations[0].type).toBe('GITHUB_TOKEN');
    expect(violations[0].ruleId).toBe('SEC-004-GITHUB-TOKEN');
  });

  it('should detect Slack bot tokens', () => {
    const fakeToken = ['xoxb', '-123456789012-123456789012-abcdefghijklmnopqrstuvwx'].join('');
    const snippet = `const slack = "${fakeToken}";`;
    const violations = scanContentForSecrets(snippet, 'slack.ts', process.cwd());
    expect(violations.length).toBe(1);
    expect(violations[0].type).toBe('SLACK_TOKEN');
    expect(violations[0].ruleId).toBe('SEC-005-SLACK-TOKEN');
  });

  it('should detect Google Cloud API keys', () => {
    const fakeKey = ['AIza', 'SyD-1234567890abcdefghijklmnopqrstuv'].join('');
    const snippet = `const gkey = "${fakeKey}";`;
    const violations = scanContentForSecrets(snippet, 'google.ts', process.cwd());
    expect(violations.length).toBe(1);
    expect(violations[0].type).toBe('GOOGLE_API_KEY');
  });

  it('should detect OpenAI API keys', () => {
    const fakeKey = ['sk-proj-', '1234567890abcdef1234567890abcdef1234567890abcdef'].join('');
    const snippet = `const openai = "${fakeKey}";`;
    const violations = scanContentForSecrets(snippet, 'ai.ts', process.cwd());
    expect(violations.length).toBe(1);
    expect(violations[0].type).toBe('OPENAI_API_KEY');
  });

  it('should ignore false positives and placeholder keywords', () => {
    const snippet = `
const key1 = "your-api-key-here";
const key2 = "test-secret-value";
const key3 = "dummy_token_for_tests";
`;
    const violations = scanContentForSecrets(snippet, 'test.ts', process.cwd());
    expect(violations.length).toBe(0);
  });

  it('should respect inline suppression comments (ai-sdlc:allow-secret)', () => {
    const fakeToken = ['ghp_', '123456789012345678901234567890123456'].join('');
    const snippet = `\nconst realLookingToken = "${fakeToken}"; // ai-sdlc:allow-secret\n`;
    const violations = scanContentForSecrets(snippet, 'test.ts', process.cwd());
    expect(violations.length).toBe(0);
  });

  it('should pass cleanly on repository root with zero credential leaks', () => {
    const res = verifySecrets({ rootDir: process.cwd() });
    expect(res.success).toBe(true);
    expect(res.findingsCount).toBe(0);
  });

  it('should fail and block when a leaked credential exists in a target directory', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-secret-test-'));
    try {
      const fakeToken = ['ghp_', '123456789012345678901234567890123456'].join('');
      const leakedFile = path.join(tempDir, 'leaked.ts');
      fs.writeFileSync(
        leakedFile,
        `const leaked = "${fakeToken}";\n`
      );

      const res = verifySecrets({ rootDir: tempDir });
      expect(res.success).toBe(false);
      expect(res.findingsCount).toBe(1);
      expect(res.findings[0].type).toBe('GITHUB_TOKEN');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
