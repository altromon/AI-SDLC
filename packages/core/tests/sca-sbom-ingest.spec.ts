import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ingestSbomFile, ScaSbomError } from '../src/verifiers/sca/sbom-ingest.js';

describe('CHG-056 TSK-001: sbom-ingest security confinement & parser guards', () => {
  const tmpDirs: string[] = [];

  function makeTmpDir(prefix = 'aisdlc-sbom-ingest-'): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tmpDirs.push(dir);
    return dir;
  }

  function validCycloneDxJson(extra: Record<string, unknown> = {}): string {
    return JSON.stringify({
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      version: 1,
      components: [
        {
          type: 'library',
          name: 'zod',
          version: '3.23.8',
          purl: 'pkg:npm/zod@3.23.8',
          licenses: [{ license: { id: 'MIT' } }],
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

  it('ingests a valid CycloneDX JSON file inside rootDir', () => {
    const rootDir = makeTmpDir();
    const sbomPath = path.join(rootDir, 'sbom.json');
    fs.writeFileSync(sbomPath, validCycloneDxJson(), 'utf-8');

    const doc = ingestSbomFile(rootDir, 'sbom.json');
    expect(doc).toBeDefined();
    expect((doc as { bomFormat?: string }).bomFormat).toBe('CycloneDX');
  });

  it('rejects missing SBOM file with ERR_SBOM_NOT_FOUND without leaking absolute paths', () => {
    const rootDir = makeTmpDir();
    try {
      ingestSbomFile(rootDir, 'does-not-exist.json');
      expect.fail('Expected ScaSbomError');
    } catch (err) {
      expect(err).toBeInstanceOf(ScaSbomError);
      expect((err as ScaSbomError).code).toBe('ERR_SBOM_NOT_FOUND');
      expect((err as Error).message).not.toContain(rootDir);
    }
  });

  it('rejects directory path with ERR_SBOM_NOT_REGULAR_FILE', () => {
    const rootDir = makeTmpDir();
    const subDir = path.join(rootDir, 'subdir');
    fs.mkdirSync(subDir);

    try {
      ingestSbomFile(rootDir, 'subdir');
      expect.fail('Expected ScaSbomError');
    } catch (err) {
      expect(err).toBeInstanceOf(ScaSbomError);
      expect((err as ScaSbomError).code).toBe('ERR_SBOM_NOT_REGULAR_FILE');
    }
  });

  it('rejects path traversal outside rootDir with ERR_SBOM_PATH_OUTSIDE_ROOT', () => {
    const parentDir = makeTmpDir();
    const rootDir = path.join(parentDir, 'project');
    fs.mkdirSync(rootDir);
    const outsideFile = path.join(parentDir, 'outside.json');
    fs.writeFileSync(outsideFile, validCycloneDxJson(), 'utf-8');

    try {
      ingestSbomFile(rootDir, '../outside.json');
      expect.fail('Expected ScaSbomError');
    } catch (err) {
      expect(err).toBeInstanceOf(ScaSbomError);
      expect((err as ScaSbomError).code).toBe('ERR_SBOM_PATH_OUTSIDE_ROOT');
      expect((err as Error).message).not.toContain(parentDir);
    }
  });

  it('rejects UNC paths with ERR_SBOM_PATH_OUTSIDE_ROOT', () => {
    const rootDir = makeTmpDir();
    try {
      ingestSbomFile(rootDir, '\\\\server\\share\\sbom.json');
      expect.fail('Expected ScaSbomError');
    } catch (err) {
      expect(err).toBeInstanceOf(ScaSbomError);
      expect((err as ScaSbomError).code).toBe('ERR_SBOM_PATH_OUTSIDE_ROOT');
    }
  });

  it('rejects symlinks resolving outside rootDir with ERR_SBOM_PATH_OUTSIDE_ROOT', () => {
    const parentDir = makeTmpDir();
    const rootDir = path.join(parentDir, 'project');
    fs.mkdirSync(rootDir);
    const outsideFile = path.join(parentDir, 'secret-outside.json');
    fs.writeFileSync(outsideFile, validCycloneDxJson(), 'utf-8');

    const linkPath = path.join(rootDir, 'link-sbom.json');
    let symlinkCreated = false;
    try {
      fs.symlinkSync(outsideFile, linkPath, 'file');
      symlinkCreated = true;
    } catch {
      // Fallback on Windows environments without symlink privileges: stub realpathSync
      fs.writeFileSync(linkPath, validCycloneDxJson(), 'utf-8');
      const realpathOrig = fs.realpathSync;
      vi.spyOn(fs, 'realpathSync').mockImplementation((p: fs.PathLike) => {
        if (String(p).endsWith('link-sbom.json')) {
          return outsideFile;
        }
        return realpathOrig(p);
      });
    }

    try {
      ingestSbomFile(rootDir, 'link-sbom.json');
      expect.fail('Expected ScaSbomError');
    } catch (err) {
      expect(err).toBeInstanceOf(ScaSbomError);
      expect((err as ScaSbomError).code).toBe('ERR_SBOM_PATH_OUTSIDE_ROOT');
    } finally {
      if (symlinkCreated && fs.existsSync(linkPath)) {
        fs.unlinkSync(linkPath);
      }
    }
  });

  it('rejects files larger than 50 MiB with ERR_SBOM_TOO_LARGE', () => {
    const rootDir = makeTmpDir();
    const sbomPath = path.join(rootDir, 'huge-sbom.json');
    fs.writeFileSync(sbomPath, validCycloneDxJson(), 'utf-8');

    const fstatOrig = fs.fstatSync;
    vi.spyOn(fs, 'fstatSync').mockImplementation((fd: number) => {
      const stat = fstatOrig(fd);
      return Object.assign(Object.create(Object.getPrototypeOf(stat)), stat, {
        size: 50 * 1024 * 1024 + 1,
      });
    });

    try {
      ingestSbomFile(rootDir, 'huge-sbom.json');
      expect.fail('Expected ScaSbomError');
    } catch (err) {
      expect(err).toBeInstanceOf(ScaSbomError);
      expect((err as ScaSbomError).code).toBe('ERR_SBOM_TOO_LARGE');
    }
  });

  it('rejects malformed JSON with ERR_SBOM_MALFORMED', () => {
    const rootDir = makeTmpDir();
    fs.writeFileSync(path.join(rootDir, 'bad.json'), '{ "bomFormat": ', 'utf-8');

    try {
      ingestSbomFile(rootDir, 'bad.json');
      expect.fail('Expected ScaSbomError');
    } catch (err) {
      expect(err).toBeInstanceOf(ScaSbomError);
      expect((err as ScaSbomError).code).toBe('ERR_SBOM_MALFORMED');
    }
  });

  it('rejects unsupported JSON formats with ERR_SBOM_UNSUPPORTED', () => {
    const rootDir = makeTmpDir();
    fs.writeFileSync(path.join(rootDir, 'unknown.json'), JSON.stringify({ hello: 'world' }), 'utf-8');

    try {
      ingestSbomFile(rootDir, 'unknown.json');
      expect.fail('Expected ScaSbomError');
    } catch (err) {
      expect(err).toBeInstanceOf(ScaSbomError);
      expect((err as ScaSbomError).code).toBe('ERR_SBOM_UNSUPPORTED');
    }
  });

  it('rejects JSON exceeding depth 64 with ERR_SBOM_LIMIT_EXCEEDED', () => {
    const rootDir = makeTmpDir();
    let nested: Record<string, unknown> = { leaf: true };
    for (let i = 0; i < 66; i++) {
      nested = { child: nested };
    }
    fs.writeFileSync(path.join(rootDir, 'deep.json'), validCycloneDxJson({ extra: nested }), 'utf-8');

    try {
      ingestSbomFile(rootDir, 'deep.json');
      expect.fail('Expected ScaSbomError');
    } catch (err) {
      expect(err).toBeInstanceOf(ScaSbomError);
      expect((err as ScaSbomError).code).toBe('ERR_SBOM_LIMIT_EXCEEDED');
    }
  });

  it('rejects SBOM with more than 100000 components with ERR_SBOM_LIMIT_EXCEEDED', () => {
    const rootDir = makeTmpDir();
    const components = Array.from({ length: 100_001 }, (_, i) => ({
      type: 'library',
      name: `pkg-${i}`,
      version: '1.0.0',
    }));
    fs.writeFileSync(
      path.join(rootDir, 'many.json'),
      JSON.stringify({ bomFormat: 'CycloneDX', specVersion: '1.5', version: 1, components }),
      'utf-8'
    );

    try {
      ingestSbomFile(rootDir, 'many.json');
      expect.fail('Expected ScaSbomError');
    } catch (err) {
      expect(err).toBeInstanceOf(ScaSbomError);
      expect((err as ScaSbomError).code).toBe('ERR_SBOM_LIMIT_EXCEEDED');
    }
  });

  it.each(['__proto__', 'constructor', 'prototype'])(
    'rejects unsafe JSON key "%s" with ERR_SBOM_UNSAFE_KEY',
    (unsafeKey) => {
      const rootDir = makeTmpDir();
      const rawJson = `{"bomFormat":"CycloneDX","specVersion":"1.5","version":1,"components":[{"type":"library","name":"a","version":"1.0.0","${unsafeKey}":{}}]}`;
      fs.writeFileSync(path.join(rootDir, 'unsafe.json'), rawJson, 'utf-8');

      try {
        ingestSbomFile(rootDir, 'unsafe.json');
        expect.fail('Expected ScaSbomError');
      } catch (err) {
        expect(err).toBeInstanceOf(ScaSbomError);
        expect((err as ScaSbomError).code).toBe('ERR_SBOM_UNSAFE_KEY');
      }
    }
  );
});
