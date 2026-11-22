import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  runVerifyAll,
  runVerifyLicenses,
  runVerifySast,
  runVerifySecrets,
  runVerifySecurity,
} from '../src/commands/verify.js';

describe('CLI verify security, secrets, sast, licenses & verify all branches (Happy / Sad / Boundary)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-cli-sec-br-'));
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('exercises runVerifySecrets, runVerifySast, runVerifySecurity, and runVerifyLicenses in text, JSON, and SARIF failure modes', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const fakeGhp = ['ghp_', '9xK2mP8qR4tV7wZ1yB5nC3jL6fH0dS2aE4gU'].join('');
    fs.writeFileSync(
      path.join(tmpDir, 'src', 'bad.ts'),
      `const tok = "${fakeGhp}";\nconst x = eval(tok);\n`,
      'utf-8'
    );

    expect(runVerifySecrets({ root: tmpDir, silent: false })).toBe(false);
    expect(runVerifySecrets({ root: tmpDir, json: true })).toBe(false);

    expect(runVerifySast({ root: tmpDir, silent: false })).toBe(false);
    expect(runVerifySast({ root: tmpDir, format: 'sarif' })).toBe(false);
    expect(runVerifySast({ root: tmpDir, json: true })).toBe(false);

    expect(runVerifySecurity({ root: tmpDir, silent: false })).toBe(false);
    expect(runVerifySecurity({ root: tmpDir, format: 'sarif' })).toBe(false);
    expect(runVerifySecurity({ root: tmpDir, json: true })).toBe(false);

    // Copyleft license failure in text & JSON
    fs.mkdirSync(path.join(tmpDir, 'node_modules', 'gpl-dep'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'x', dependencies: { 'gpl-dep': '1.0.0' } }));
    fs.writeFileSync(
      path.join(tmpDir, 'node_modules', 'gpl-dep', 'package.json'),
      JSON.stringify({ name: 'gpl-dep', version: '1.0.0', license: 'GPL-3.0-only' })
    );
    expect(runVerifyLicenses({ root: tmpDir, dynamic: true, scanVulnerabilities: false, silent: false })).toBe(false);
    expect(runVerifyLicenses({ root: tmpDir, dynamic: true, scanVulnerabilities: false, json: true })).toBe(false);
  });

  it('exercises runVerifyAll in failing text and JSON modes', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fs.writeFileSync(path.join(tmpDir, 'src', 'bad.ts'), 'const x = eval("1+1");\n', 'utf-8');

    expect(runVerifyAll({ root: tmpDir, requireCoverageReport: false, silent: false })).toBe(false);
    expect(runVerifyAll({ root: tmpDir, requireCoverageReport: false, json: true })).toBe(false);
  });
});
