import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifyLicenses } from '../src/verifiers/licenses.js';
import { runVerifyLicenses } from '../../cli/src/commands/verify.js';

describe('CHG-056 TSK-004: explicit --sbom <path> CLI option & no auto-discovery', () => {
  const tmpDirs: string[] = [];

  function makeTmpDir(prefix = 'aisdlc-sbom-cli-'): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tmpDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    vi.restoreAllMocks();
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function setupProjectWithSbom(rootDir: string, sbomContent: string): void {
    const pkgDir = path.join(rootDir, 'node_modules', 'gap-pkg');
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({ name: 'gap-pkg', version: '1.0.0' }),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(rootDir, 'package.json'),
      JSON.stringify({ name: 'test-app', version: '1.0.0', dependencies: { 'gap-pkg': '1.0.0' } }),
      'utf-8'
    );
    fs.writeFileSync(path.join(rootDir, 'sbom.json'), sbomContent, 'utf-8');
    fs.writeFileSync(path.join(rootDir, 'bom.json'), sbomContent, 'utf-8');
  }

  it('does NOT read sbom.json or bom.json when --sbom is omitted (no auto-discovery)', () => {
    const rootDir = makeTmpDir();
    // Malformed SBOMs at root should never be opened if --sbom is not passed
    setupProjectWithSbom(rootDir, '{ invalid-json');

    const result = verifyLicenses({
      rootDir,
      scanVulnerabilities: false,
    });

    const gapDep = result.scannedDependencies?.find((d) => d.name === 'gap-pkg');
    expect(gapDep?.provenance).not.toBe('sbom-declared');
    expect(gapDep?.spdxLicense).not.toBe('MIT');
  });

  it('ingests explicit --sbom <path> in verifyLicenses and fills license gaps without altering JSON gate', () => {
    const rootDir = makeTmpDir();
    setupProjectWithSbom(
      rootDir,
      JSON.stringify({
        bomFormat: 'CycloneDX',
        specVersion: '1.5',
        components: [
          {
            type: 'library',
            name: 'gap-pkg',
            version: '1.0.0',
            purl: 'pkg:npm/gap-pkg@1.0.0',
            licenses: [{ license: { id: 'MIT' } }],
          },
          {
            type: 'library',
            name: 'extra-in-sbom',
            version: '9.9.9',
            purl: 'pkg:npm/extra-in-sbom@9.9.9',
            licenses: [{ license: { id: 'MIT' } }],
          },
        ],
      })
    );

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const passed = runVerifyLicenses({
      root: rootDir,
      sbomInput: 'sbom.json',
      vuln: false,
      json: true,
    } as Parameters<typeof runVerifyLicenses>[0]);

    expect(passed).toBe(true);
    const jsonCall = logSpy.mock.calls.find((c) => typeof c[0] === 'string' && c[0].includes('"gate": "licenses"'));
    expect(jsonCall).toBeDefined();
    const parsed = JSON.parse(jsonCall![0] as string);
    expect(parsed.success).toBe(true);
    expect(stderrSpy).toHaveBeenCalled();
  });

  it('fails closed when explicit --sbom points to a missing file', () => {
    const rootDir = makeTmpDir();
    fs.writeFileSync(
      path.join(rootDir, 'package.json'),
      JSON.stringify({ name: 'test-app', version: '1.0.0' }),
      'utf-8'
    );

    expect(() =>
      verifyLicenses({
        rootDir,
        sbomInputPath: 'nonexistent-sbom.json',
        scanVulnerabilities: false,
      } as Parameters<typeof verifyLicenses>[0])
    ).toThrow(/ERR_SBOM_NOT_FOUND/);
  });
});
