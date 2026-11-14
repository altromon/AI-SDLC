import fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ingestSarifFiles, SarifIngestionError } from '../src/verifiers/sarif-ingest.js';

describe('CHG-057 TSK-001: hardened SARIF v2.1.0 file ingestion & security guards', () => {
  const tmpDirs: string[] = [];

  function makeTmpDir(prefix = 'aisdlc-sarif-ingest-'): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tmpDirs.push(dir);
    return dir;
  }

  function validSarifJson(extra: Record<string, unknown> = {}): string {
    return JSON.stringify({
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: { driver: { name: 'semgrep', rules: [] } },
          results: [
            {
              ruleId: 'js.lang.security.audit.eval',
              level: 'error',
              message: { text: 'Detected eval() usage' },
              locations: [
                {
                  physicalLocation: {
                    artifactLocation: { uri: 'src/app.ts' },
                    region: { startLine: 10 },
                  },
                },
              ],
            },
          ],
        },
      ],
      ...extra,
    });
  }

  afterEach(() => {
    vi.restoreAllMocks();
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('ingests valid SARIF 2.1.0 files inside rootDir offline', () => {
    const rootDir = makeTmpDir();
    fs.writeFileSync(path.join(rootDir, 'a.sarif'), validSarifJson(), 'utf-8');
    fs.writeFileSync(path.join(rootDir, 'b.sarif'), validSarifJson(), 'utf-8');

    const docs = ingestSarifFiles(rootDir, ['a.sarif', 'b.sarif']);
    expect(docs).toHaveLength(2);
    expect(docs[0].version).toBe('2.1.0');
    expect(Array.isArray(docs[1].runs)).toBe(true);
  });

  it('rejects missing SARIF file with ERR_SARIF_NOT_FOUND without leaking rootDir', () => {
    const rootDir = makeTmpDir();
    try {
      ingestSarifFiles(rootDir, ['missing.sarif']);
      expect.fail('Expected SarifIngestionError');
    } catch (err) {
      expect(err).toBeInstanceOf(SarifIngestionError);
      expect((err as SarifIngestionError).code).toBe('ERR_SARIF_NOT_FOUND');
      expect((err as Error).message).not.toContain(rootDir);
    }
  });

  it('rejects directory path with ERR_SARIF_NOT_REGULAR_FILE', () => {
    const rootDir = makeTmpDir();
    fs.mkdirSync(path.join(rootDir, 'reports'));

    try {
      ingestSarifFiles(rootDir, ['reports']);
      expect.fail('Expected SarifIngestionError');
    } catch (err) {
      expect(err).toBeInstanceOf(SarifIngestionError);
      expect((err as SarifIngestionError).code).toBe('ERR_SARIF_NOT_REGULAR_FILE');
    }
  });

  it('rejects TOCTOU dev/ino mismatch between lstatSync and fstatSync with ERR_SARIF_NOT_REGULAR_FILE', () => {
    const rootDir = makeTmpDir();
    fs.writeFileSync(path.join(rootDir, 'report.sarif'), validSarifJson(), 'utf-8');

    const fstatOrig = fs.fstatSync;
    vi.spyOn(fs, 'fstatSync').mockImplementation((fd: number) => {
      const stat = fstatOrig(fd);
      return Object.assign(Object.create(Object.getPrototypeOf(stat)), stat, {
        ino: Number(stat.ino) + 999,
      });
    });

    try {
      ingestSarifFiles(rootDir, ['report.sarif']);
      expect.fail('Expected SarifIngestionError');
    } catch (err) {
      expect(err).toBeInstanceOf(SarifIngestionError);
      expect((err as SarifIngestionError).code).toBe('ERR_SARIF_NOT_REGULAR_FILE');
    }
  });

  it('rejects path traversal outside rootDir with ERR_SARIF_PATH_OUTSIDE_ROOT', () => {
    const parentDir = makeTmpDir();
    const rootDir = path.join(parentDir, 'project');
    fs.mkdirSync(rootDir);
    fs.writeFileSync(path.join(parentDir, 'outside.sarif'), validSarifJson(), 'utf-8');

    try {
      ingestSarifFiles(rootDir, ['../outside.sarif']);
      expect.fail('Expected SarifIngestionError');
    } catch (err) {
      expect(err).toBeInstanceOf(SarifIngestionError);
      expect((err as SarifIngestionError).code).toBe('ERR_SARIF_PATH_OUTSIDE_ROOT');
      expect((err as Error).message).not.toContain(parentDir);
    }
  });

  it('rejects UNC paths with ERR_SARIF_PATH_OUTSIDE_ROOT', () => {
    const rootDir = makeTmpDir();
    try {
      ingestSarifFiles(rootDir, ['\\\\server\\share\\report.sarif']);
      expect.fail('Expected SarifIngestionError');
    } catch (err) {
      expect(err).toBeInstanceOf(SarifIngestionError);
      expect((err as SarifIngestionError).code).toBe('ERR_SARIF_PATH_OUTSIDE_ROOT');
    }
  });

  it('rejects symlinks resolving outside rootDir with ERR_SARIF_PATH_OUTSIDE_ROOT', () => {
    const parentDir = makeTmpDir();
    const rootDir = path.join(parentDir, 'project');
    fs.mkdirSync(rootDir);
    const outsideFile = path.join(parentDir, 'outside.sarif');
    fs.writeFileSync(outsideFile, validSarifJson(), 'utf-8');

    const linkPath = path.join(rootDir, 'link.sarif');
    let symlinkCreated = false;
    try {
      fs.symlinkSync(outsideFile, linkPath, 'file');
      symlinkCreated = true;
    } catch {
      fs.writeFileSync(linkPath, validSarifJson(), 'utf-8');
      const realpathOrig = fs.realpathSync;
      vi.spyOn(fs, 'realpathSync').mockImplementation((p: fs.PathLike) => {
        if (String(p).endsWith('link.sarif')) return outsideFile;
        return realpathOrig(p);
      });
    }

    try {
      ingestSarifFiles(rootDir, ['link.sarif']);
      expect.fail('Expected SarifIngestionError');
    } catch (err) {
      expect(err).toBeInstanceOf(SarifIngestionError);
      expect((err as SarifIngestionError).code).toBe('ERR_SARIF_PATH_OUTSIDE_ROOT');
    } finally {
      if (symlinkCreated && fs.existsSync(linkPath)) {
        fs.unlinkSync(linkPath);
      }
    }
  });

  it('accepts Windows drive-letter casing differences between rootDir and realpath', () => {
    const rootDir = makeTmpDir();
    const sarifFile = path.join(rootDir, 'report.sarif');
    fs.writeFileSync(sarifFile, validSarifJson(), 'utf-8');

    const realRoot = fs.realpathSync(rootDir);
    const realFile = fs.realpathSync(sarifFile);
    if (/^[A-Za-z]:/.test(realRoot)) {
      const flippedRoot = realRoot[0].toLowerCase() + realRoot.slice(1);
      const flippedFile = realFile[0].toUpperCase() + realFile.slice(1);
      const realpathOrig = fs.realpathSync;
      vi.spyOn(fs, 'realpathSync').mockImplementation((p: fs.PathLike) => {
        const s = String(p);
        if (s === rootDir || s === realRoot) return flippedRoot;
        if (s.endsWith('report.sarif')) return flippedFile;
        return realpathOrig(p);
      });
    }

    const docs = ingestSarifFiles(rootDir, ['report.sarif']);
    expect(docs).toHaveLength(1);
  });

  it('rejects files larger than 50 MiB with ERR_SARIF_TOO_LARGE', () => {
    const rootDir = makeTmpDir();
    fs.writeFileSync(path.join(rootDir, 'huge.sarif'), validSarifJson(), 'utf-8');

    const fstatOrig = fs.fstatSync;
    vi.spyOn(fs, 'fstatSync').mockImplementation((fd: number) => {
      const stat = fstatOrig(fd);
      return Object.assign(Object.create(Object.getPrototypeOf(stat)), stat, {
        size: 50 * 1024 * 1024 + 1,
      });
    });

    try {
      ingestSarifFiles(rootDir, ['huge.sarif']);
      expect.fail('Expected SarifIngestionError');
    } catch (err) {
      expect(err).toBeInstanceOf(SarifIngestionError);
      expect((err as SarifIngestionError).code).toBe('ERR_SARIF_TOO_LARGE');
    }
  });

  it('rejects JSON exceeding depth 64 before JSON.parse with ERR_SARIF_LIMIT_EXCEEDED', () => {
    const rootDir = makeTmpDir();
    let nested: Record<string, unknown> = { leaf: true };
    for (let i = 0; i < 66; i++) {
      nested = { child: nested };
    }
    fs.writeFileSync(path.join(rootDir, 'deep.sarif'), validSarifJson({ properties: nested }), 'utf-8');

    const parseSpy = vi.spyOn(JSON, 'parse');
    try {
      ingestSarifFiles(rootDir, ['deep.sarif']);
      expect.fail('Expected SarifIngestionError');
    } catch (err) {
      expect(err).toBeInstanceOf(SarifIngestionError);
      expect((err as SarifIngestionError).code).toBe('ERR_SARIF_LIMIT_EXCEEDED');
      expect(parseSpy).not.toHaveBeenCalled();
    }
  });

  it('rejects more than 100000 accumulated results across files with ERR_SARIF_LIMIT_EXCEEDED', () => {
    const rootDir = makeTmpDir();
    const makeResults = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        ruleId: `RULE-${i}`,
        level: 'warning',
        message: { text: 'msg' },
      }));

    fs.writeFileSync(
      path.join(rootDir, 'r1.sarif'),
      JSON.stringify({ version: '2.1.0', runs: [{ tool: { driver: { name: 't' } }, results: makeResults(60_000) }] }),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(rootDir, 'r2.sarif'),
      JSON.stringify({ version: '2.1.0', runs: [{ tool: { driver: { name: 't' } }, results: makeResults(40_001) }] }),
      'utf-8'
    );

    try {
      ingestSarifFiles(rootDir, ['r1.sarif', 'r2.sarif']);
      expect.fail('Expected SarifIngestionError');
    } catch (err) {
      expect(err).toBeInstanceOf(SarifIngestionError);
      expect((err as SarifIngestionError).code).toBe('ERR_SARIF_LIMIT_EXCEEDED');
    }
  });

  it.each(['__proto__', 'constructor', 'prototype'])(
    'rejects unsafe prototype pollution key "%s" with ERR_SARIF_UNSAFE_KEY',
    (unsafeKey) => {
      const rootDir = makeTmpDir();
      const rawJson = `{"version":"2.1.0","runs":[{"tool":{"driver":{"name":"semgrep"}},"results":[{"ruleId":"R1","message":{"text":"x"},"${unsafeKey}":{"polluted":true}}]}]}`;
      fs.writeFileSync(path.join(rootDir, 'unsafe.sarif'), rawJson, 'utf-8');

      try {
        ingestSarifFiles(rootDir, ['unsafe.sarif']);
        expect.fail('Expected SarifIngestionError');
      } catch (err) {
        expect(err).toBeInstanceOf(SarifIngestionError);
        expect((err as SarifIngestionError).code).toBe('ERR_SARIF_UNSAFE_KEY');
        expect(({} as Record<string, unknown>).polluted).toBeUndefined();
      }
    }
  );

  it('rejects malformed JSON with ERR_SARIF_MALFORMED and fails closed across multiple files', () => {
    const rootDir = makeTmpDir();
    fs.writeFileSync(path.join(rootDir, 'good.sarif'), validSarifJson(), 'utf-8');
    fs.writeFileSync(path.join(rootDir, 'bad.sarif'), '{ "version": "2.1.0", ', 'utf-8');

    try {
      ingestSarifFiles(rootDir, ['good.sarif', 'bad.sarif']);
      expect.fail('Expected SarifIngestionError');
    } catch (err) {
      expect(err).toBeInstanceOf(SarifIngestionError);
      expect((err as SarifIngestionError).code).toBe('ERR_SARIF_MALFORMED');
    }
  });

  it('rejects non-2.1.0 version or missing runs array with ERR_SARIF_UNSUPPORTED_VERSION', () => {
    const rootDir = makeTmpDir();
    fs.writeFileSync(path.join(rootDir, 'v20.sarif'), JSON.stringify({ version: '2.0.0', runs: [] }), 'utf-8');
    fs.writeFileSync(path.join(rootDir, 'noruns.sarif'), JSON.stringify({ version: '2.1.0', runs: {} }), 'utf-8');

    for (const file of ['v20.sarif', 'noruns.sarif']) {
      try {
        ingestSarifFiles(rootDir, [file]);
        expect.fail(`Expected SarifIngestionError for ${file}`);
      } catch (err) {
        expect(err).toBeInstanceOf(SarifIngestionError);
        expect((err as SarifIngestionError).code).toBe('ERR_SARIF_UNSUPPORTED_VERSION');
      }
    }
  });

  it('tracks escaped quotes accurately: rejects \\" + 1000-deep array PoC and allows \\" + 65 braces inside string', () => {
    const rootDir = makeTmpDir();
    const deepPoc = `{"version":"2.1.0","runs":[{"tool":{"driver":{"name":"semgrep"}},"results":[{"ruleId":"R1","message":{"text":"\\""},"x":${'['.repeat(1000)}${']'.repeat(1000)}}]}]}`;
    fs.writeFileSync(path.join(rootDir, 'escaped-poc.sarif'), deepPoc, 'utf-8');

    try {
      ingestSarifFiles(rootDir, ['escaped-poc.sarif']);
      expect.fail('Expected SarifIngestionError');
    } catch (err) {
      expect(err).toBeInstanceOf(SarifIngestionError);
      expect((err as SarifIngestionError).code).toBe('ERR_SARIF_LIMIT_EXCEEDED');
    }

    const validBraces = `{"version":"2.1.0","runs":[{"tool":{"driver":{"name":"semgrep"}},"results":[{"ruleId":"R1","message":{"text":"prefix \\" ${'{'.repeat(65)} suffix"}}]}]}`;
    fs.writeFileSync(path.join(rootDir, 'escaped-ok.sarif'), validBraces, 'utf-8');
    const docs = ingestSarifFiles(rootDir, ['escaped-ok.sarif']);
    expect(docs).toHaveLength(1);

    // Escaped backslash before closing quote (\\") properly closes the string
    const validBackslashQuote = `{"version":"2.1.0","runs":[{"tool":{"driver":{"name":"semgrep"}},"results":[{"ruleId":"R1","message":{"text":"path\\\\"}}]}]}`;
    fs.writeFileSync(path.join(rootDir, 'backslash-quote.sarif'), validBackslashQuote, 'utf-8');
    expect(ingestSarifFiles(rootDir, ['backslash-quote.sarif'])).toHaveLength(1);
  });
});
