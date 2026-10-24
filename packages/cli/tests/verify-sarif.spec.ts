import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  runVerifySecurity,
  runVerifySast,
  runVerifySecrets,
  isSarifOutput,
} from '../src/commands/verify.js';
import { SARIF_SCHEMA_2_1_0 } from '@aisdlc/core';

describe('CLI SARIF Output & Reporting Suite', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-sarif-test-'));
    fs.mkdirSync(path.join(tmpDir, 'reports'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    delete process.env.AISDLC_FORMAT;
    delete process.env.AISDLC_OUTPUT;
  });

  it('detects sarif format via options and environment variables', () => {
    expect(isSarifOutput({ format: 'sarif' })).toBe(true);
    expect(isSarifOutput({ format: 'SARIF' })).toBe(true);
    expect(isSarifOutput({ format: 'json' })).toBe(false);
    expect(isSarifOutput({})).toBe(false);

    process.env.AISDLC_FORMAT = 'sarif';
    expect(isSarifOutput({})).toBe(true);

    delete process.env.AISDLC_FORMAT;
    process.env.AISDLC_OUTPUT = 'sarif';
    expect(isSarifOutput({})).toBe(true);
  });

  it('generates reports/security.sarif by default during runVerifySecurity', () => {
    // Write a clean file
    fs.writeFileSync(path.join(tmpDir, 'src', 'index.ts'), 'export const hello = "world";\n');

    const result = runVerifySecurity({ root: tmpDir, silent: true });
    expect(result).toBe(true);

    const sarifPath = path.join(tmpDir, 'reports', 'security.sarif');
    expect(fs.existsSync(sarifPath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(sarifPath, 'utf-8'));
    expect(content.$schema).toBe(SARIF_SCHEMA_2_1_0);
    expect(content.version).toBe('2.1.0');
    expect(content.runs[0].results).toHaveLength(0);
  });

  it('writes SARIF to custom output file in runVerifySast with format sarif', () => {
    const customOutput = path.join(tmpDir, 'reports', 'sast-findings.sarif');
    fs.writeFileSync(path.join(tmpDir, 'src', 'index.ts'), 'const x = 1;\n');

    const result = runVerifySast({
      root: tmpDir,
      format: 'sarif',
      output: customOutput,
      silent: true,
    });
    expect(result).toBe(true);
    expect(fs.existsSync(customOutput)).toBe(true);

    const content = JSON.parse(fs.readFileSync(customOutput, 'utf-8'));
    expect(content.version).toBe('2.1.0');
  });

  it('writes SARIF to custom output file in runVerifySecrets with format sarif', () => {
    const customOutput = path.join(tmpDir, 'reports', 'secrets-findings.sarif');
    fs.writeFileSync(path.join(tmpDir, 'src', 'index.ts'), 'const x = 1;\n');

    const result = runVerifySecrets({
      root: tmpDir,
      format: 'sarif',
      output: customOutput,
      silent: true,
    });
    expect(result).toBe(true);
    expect(fs.existsSync(customOutput)).toBe(true);

    const content = JSON.parse(fs.readFileSync(customOutput, 'utf-8'));
    expect(content.version).toBe('2.1.0');
  });
});
