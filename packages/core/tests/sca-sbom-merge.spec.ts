import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ScannedDependency } from '../src/types/index.js';
import type { SbomComponent } from '../src/verifiers/sca/sbom-parse.js';
import { mergeSbomGaps, scanWithSbom } from '../src/verifiers/sca/scanner.js';

describe('CHG-056 TSK-003: SBOM gap-filling merge & lockfile cross-check warnings', () => {
  const tmpDirs: string[] = [];

  function makeTmpDir(prefix = 'aisdlc-sbom-merge-'): string {
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

  it('fills UNKNOWN and UNRESOLVED local licenses with sbom-declared provenance', () => {
    const localDeps: ScannedDependency[] = [
      {
        name: 'unresolved-lib',
        version: '1.0.0',
        spdxLicense: 'UNRESOLVED',
        unresolvedReason: 'cli_not_installed',
        purl: 'pkg:npm/unresolved-lib@1.0.0',
      },
      {
        name: 'unknown-lib',
        version: '2.0.0',
        spdxLicense: 'UNKNOWN',
        purl: 'pkg:npm/unknown-lib@2.0.0',
      },
    ];
    const sbomComponents: SbomComponent[] = [
      {
        ecosystem: 'npm',
        name: 'unresolved-lib',
        version: '1.0.0',
        spdxLicense: 'MIT',
        purl: 'pkg:npm/unresolved-lib@1.0.0',
      },
      {
        ecosystem: 'npm',
        name: 'unknown-lib',
        version: '2.0.0',
        spdxLicense: 'Apache-2.0',
        purl: 'pkg:npm/unknown-lib@2.0.0',
      },
    ];

    const merged = mergeSbomGaps(localDeps, sbomComponents);
    expect(merged.dependencies).toHaveLength(2);
    expect(merged.dependencies[0]).toMatchObject({
      name: 'unknown-lib',
      spdxLicense: 'Apache-2.0',
      provenance: 'sbom-declared',
    });
    expect(merged.dependencies[1]).toMatchObject({
      name: 'unresolved-lib',
      spdxLicense: 'MIT',
      provenance: 'sbom-declared',
    });
    expect(merged.dependencies[1].unresolvedReason).toBeUndefined();
  });

  it('never overrides locally resolved licenses with SBOM declarations', () => {
    const localDeps: ScannedDependency[] = [
      {
        name: 'lib',
        version: '1.0.0',
        spdxLicense: 'MIT',
        provenance: 'local-metadata',
        purl: 'pkg:npm/lib@1.0.0',
      },
    ];
    const sbomComponents: SbomComponent[] = [
      {
        ecosystem: 'npm',
        name: 'lib',
        version: '1.0.0',
        spdxLicense: 'GPL-3.0-only',
        purl: 'pkg:npm/lib@1.0.0',
      },
    ];

    const merged = mergeSbomGaps(localDeps, sbomComponents);
    expect(merged.dependencies[0].spdxLicense).toBe('MIT');
    expect(merged.dependencies[0].provenance).toBe('local-metadata');
  });

  it('emits canonically sorted, sanitized missing/extra warnings without absolute paths', () => {
    const localDeps: ScannedDependency[] = [
      { name: 'a', version: '1.0.0', spdxLicense: 'MIT', purl: 'pkg:npm/a@1.0.0' },
      { name: 'b', version: '1.0.0', spdxLicense: 'MIT', purl: 'pkg:npm/b@1.0.0' },
    ];
    const sbomComponents: SbomComponent[] = [
      { ecosystem: 'npm', name: 'a', version: '1.0.0', spdxLicense: 'MIT', purl: 'pkg:npm/a@1.0.0' },
      { ecosystem: 'npm', name: 'c', version: '1.0.0', spdxLicense: 'ISC', purl: 'pkg:npm/c@1.0.0' },
    ];

    const merged = mergeSbomGaps(localDeps, sbomComponents);
    expect(merged.warnings.length).toBe(2);
    expect(merged.warnings.some((w) => w.includes('b@1.0.0'))).toBe(true);
    expect(merged.warnings.some((w) => w.includes('c@1.0.0'))).toBe(true);
    expect([...merged.warnings].sort()).toEqual(merged.warnings);
    for (const w of merged.warnings) {
      expect(w).not.toMatch(/\u001b\[/);
      expect(w).not.toMatch(/[A-Za-z]:\\|\/tmp\//);
    }
  });

  it('runs scanWithSbom offline without any OSV or network calls', () => {
    const rootDir = makeTmpDir();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const pkgDir = path.join(rootDir, 'node_modules', 'mystery');
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({ name: 'mystery', version: '1.0.0' }),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(rootDir, 'package.json'),
      JSON.stringify({ name: 'app', version: '1.0.0', dependencies: { mystery: '1.0.0' } }),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(rootDir, 'sbom.json'),
      JSON.stringify({
        bomFormat: 'CycloneDX',
        specVersion: '1.5',
        components: [
          {
            type: 'library',
            name: 'mystery',
            version: '1.0.0',
            purl: 'pkg:npm/mystery@1.0.0',
            licenses: [{ license: { id: 'MIT' } }],
          },
        ],
      }),
      'utf-8'
    );

    const result = scanWithSbom(rootDir, 'sbom.json');
    expect(fetchSpy).not.toHaveBeenCalled();
    const dep = result.dependencies.find((d) => d.name === 'mystery');
    expect(dep?.spdxLicense).toBe('MIT');
    expect(dep?.provenance).toBe('sbom-declared');
  });
});
