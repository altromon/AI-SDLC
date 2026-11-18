import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  AISDLC_MANIFEST_FILENAME,
  AisdlcVersionCheck,
  MigrationService,
  formatAisdlcVersionOutput,
  getAisdlcVersion,
  initProject,
  readAisdlcManifest,
  writeAisdlcManifest,
} from '../src/index.js';

describe('AI-SDLC Repository Version Manifest (.aisdlc.json)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-version-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('resolves the installed @aisdlc/core version as valid semver', () => {
    const version = getAisdlcVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(version).not.toBe('0.0.0');
  });

  it('reads, writes, and preserves extra metadata in .aisdlc.json', () => {
    expect(readAisdlcManifest(tmpDir)).toBeNull();

    fs.writeFileSync(
      path.join(tmpDir, AISDLC_MANIFEST_FILENAME),
      JSON.stringify({ version: '4.4.0', customFlag: true }),
      'utf-8'
    );
    expect(readAisdlcManifest(tmpDir)).toEqual({ version: '4.4.0', customFlag: true });

    writeAisdlcManifest(tmpDir, '4.5.1');
    const updated = JSON.parse(fs.readFileSync(path.join(tmpDir, AISDLC_MANIFEST_FILENAME), 'utf-8'));
    expect(updated).toEqual({ version: '4.5.1', customFlag: true });
  });

  it('returns null for invalid or empty .aisdlc.json', () => {
    fs.writeFileSync(path.join(tmpDir, AISDLC_MANIFEST_FILENAME), '{bad json', 'utf-8');
    expect(readAisdlcManifest(tmpDir)).toBeNull();

    fs.writeFileSync(path.join(tmpDir, AISDLC_MANIFEST_FILENAME), JSON.stringify({ other: 1 }), 'utf-8');
    expect(readAisdlcManifest(tmpDir)).toBeNull();
  });

  it('formats CLI version output with repo version and mismatch warning', () => {
    const installed = getAisdlcVersion();
    expect(formatAisdlcVersionOutput(tmpDir)).toBe(installed);

    writeAisdlcManifest(tmpDir, installed);
    expect(formatAisdlcVersionOutput(tmpDir)).toBe(`${installed} (repo: ${installed})`);

    writeAisdlcManifest(tmpDir, '3.9.0');
    expect(formatAisdlcVersionOutput(tmpDir)).toBe(`${installed} (repo: 3.9.0 — differs from installed CLI)`);
  });

  it('creates .aisdlc.json during initProject and skips writing in dryRun', () => {
    const dryRes = initProject({ rootDir: tmpDir, agents: 'none', ci: 'none', architecture: 'none', dryRun: true });
    expect(dryRes.success).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, AISDLC_MANIFEST_FILENAME))).toBe(false);

    const res = initProject({ rootDir: tmpDir, agents: 'none', ci: 'none', architecture: 'none' });
    expect(res.success).toBe(true);
    expect(res.filesCreated).toContain(AISDLC_MANIFEST_FILENAME);
    expect(readAisdlcManifest(tmpDir)?.version).toBe(getAisdlcVersion());
  });

  it('updates .aisdlc.json during non-dry-run migrate', async () => {
    writeAisdlcManifest(tmpDir, '4.0.0');
    const service = new MigrationService();

    const dryResult = await service.migrate({ root: tmpDir, dryRun: true, branch: 'feat/test-migrate' });
    expect(dryResult.exitCode).toBe(0);
    expect(readAisdlcManifest(tmpDir)?.version).toBe('4.0.0');

    const realResult = await service.migrate({ root: tmpDir, dryRun: false, branch: 'feat/test-migrate' });
    expect(realResult.exitCode).toBe(0);
    expect(readAisdlcManifest(tmpDir)?.version).toBe(getAisdlcVersion());
  });

  it('reports missing, invalid, mismatched, and matching versions in AisdlcVersionCheck', async () => {
    const check = new AisdlcVersionCheck();
    const installed = getAisdlcVersion();

    const missing = await check.inspect({ rootDir: tmpDir });
    expect(missing.status).toBe('warn');
    expect(missing.findings[0].id).toBe('WARN_AISDLC_MANIFEST_MISSING');

    fs.writeFileSync(path.join(tmpDir, AISDLC_MANIFEST_FILENAME), '{}', 'utf-8');
    const invalid = await check.inspect({ rootDir: tmpDir });
    expect(invalid.status).toBe('warn');
    expect(invalid.findings[0].id).toBe('WARN_AISDLC_MANIFEST_INVALID');

    writeAisdlcManifest(tmpDir, '1.2.3');
    const mismatch = await check.inspect({ rootDir: tmpDir });
    expect(mismatch.status).toBe('warn');
    expect(mismatch.findings[0].id).toBe('WARN_AISDLC_VERSION_MISMATCH');
    expect(mismatch.findings[0].details).toEqual({ repoVersion: '1.2.3', installedVersion: installed });

    writeAisdlcManifest(tmpDir, installed);
    const match = await check.inspect({ rootDir: tmpDir });
    expect(match.status).toBe('pass');
    expect(match.findings[0].id).toBe('PASS_AISDLC_VERSION_MATCH');
  });
});
