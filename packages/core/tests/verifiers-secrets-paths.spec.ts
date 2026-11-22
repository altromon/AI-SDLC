import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  calculateShannonEntropy,
  generateSecretsReportMarkdown,
  isPlaceholderOrIgnored,
  maskSecret,
  scanContentForSecrets,
  verifySecrets,
  walkProjectFiles,
} from '../src/verifiers/secrets.js';

describe('Secrets Verifier Unit Paths (Happy / Sad / Boundary / Malformed)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-secrets-unit-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('calculateShannonEntropy & maskSecret: handles empty, short, uniform, and long high-entropy strings (happy/boundary)', () => {
    expect(calculateShannonEntropy('')).toBe(0);
    expect(calculateShannonEntropy('aaaaaa')).toBe(0);
    expect(calculateShannonEntropy('abcdefgh')).toBeGreaterThan(2.5);

    expect(maskSecret('')).toBe('***[REDACTED]***');
    expect(maskSecret('short123')).toBe('***[REDACTED]***');
    expect(maskSecret('ghp_1234567890abcdef')).toBe('ghp_1****def');
  });

  it('isPlaceholderOrIgnored: detects placeholders, active suppressions, and non-ignored real values (happy/sad/boundary)', () => {
    expect(isPlaceholderOrIgnored('your-api-key-here', 'const k = "your-api-key-here";')).toBe(true);
    expect(isPlaceholderOrIgnored('my_placeholder_secret_123', 'API_KEY=my_placeholder_secret_123')).toBe(true);
    expect(
      isPlaceholderOrIgnored(
        'real_secret_value_123456',
        'TOKEN=real_secret_value_123456 // ai-sdlc:allow-secret reason="test-fixture" expires="2099-12-31" approved-by="sec-team"'
      )
    ).toBe(true);
    const fakeToken = ['ghp_', '9xK2mP8qR4tV7wZ1yB5nC3jL6fH0dS2aE4gU'].join('');
    expect(isPlaceholderOrIgnored(fakeToken, `TOKEN=${fakeToken}`)).toBe(false);
  });

  it('walkProjectFiles & scanContentForSecrets: respects excludePatterns, skips binary/empty, and detects leaks (happy/sad/boundary)', () => {
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'node_modules'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'clean.ts'), 'export const x = 1;\n', 'utf-8');
    fs.writeFileSync(path.join(tmpDir, 'node_modules', 'ignored.ts'), 'const k = "secret";\n', 'utf-8');

    const files = walkProjectFiles(tmpDir, tmpDir);
    expect(files.some((f) => f.endsWith('clean.ts'))).toBe(true);
    expect(files.some((f) => f.includes('node_modules'))).toBe(false);
    expect(walkProjectFiles(path.join(tmpDir, 'missing-dir'), tmpDir)).toEqual([]);

    expect(scanContentForSecrets('', path.join(tmpDir, 'empty.ts'), tmpDir)).toEqual([]);
    const fakeGhp = ['ghp_', '9xK2mP8qR4tV7wZ1yB5nC3jL6fH0dS2aE4gU'].join('');
    const leaks = scanContentForSecrets(`const tok = "${fakeGhp}";`, path.join(tmpDir, 'src', 'leak.ts'), tmpDir);
    expect(leaks.length).toBeGreaterThan(0);
    expect(leaks[0].maskedMatch).toContain('****');
  });

  it('verifySecrets & generateSecretsReportMarkdown: passes clean repo, fails on leak, and renders both markdown reports (happy/sad)', () => {
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'app.ts'), 'export const ok = true;\n', 'utf-8');

    const cleanRes = verifySecrets({ rootDir: tmpDir, gitleaks: false });
    expect(cleanRes.success).toBe(true);
    expect(cleanRes.reportMarkdown).toContain('COMPLIANT');

    const fakeGhp = ['ghp_', '9xK2mP8qR4tV7wZ1yB5nC3jL6fH0dS2aE4gU'].join('');
    fs.writeFileSync(path.join(tmpDir, 'src', 'bad.ts'), `const t = "${fakeGhp}";\n`, 'utf-8');
    const dirtyRes = verifySecrets({ rootDir: tmpDir, gitleaks: false });
    expect(dirtyRes.success).toBe(false);
    expect(dirtyRes.findingsCount).toBeGreaterThan(0);
    const md = generateSecretsReportMarkdown(dirtyRes);
    expect(md).toContain('Detected Secret Leaks Detail');
    expect(md).toContain('Mandatory Remediation Protocol');
  });
});
