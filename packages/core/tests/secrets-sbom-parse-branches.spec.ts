import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseIngestedSbom } from '../src/verifiers/sca/sbom-parse.js';
import { getGitDiffLines, verifySecrets } from '../src/verifiers/secrets.js';

describe('Secrets Diff/Suppressions & SBOM Parse Variants (Happy / Sad / Boundary / Malformed)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-inc23-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('secrets: exercises diff mode on non-git dir, .secretsignore, active vs expired suppressions, and gitleaks fallback', () => {
    expect(getGitDiffLines(tmpDir, 'main')).toEqual([]);

    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.secretsignore'), 'src/ignored.ts\n', 'utf-8');
    const fakeGhp = ['ghp_', '9xK2mP8qR4tV7wZ1yB5nC3jL6fH0dS2aE4gU'].join('');

    fs.writeFileSync(path.join(tmpDir, 'src', 'ignored.ts'), `const k = "${fakeGhp}";\n`, 'utf-8');
    fs.writeFileSync(
      path.join(tmpDir, 'src', 'active-supp.ts'),
      `const k = "${fakeGhp}"; // ai-sdlc:allow-secret reason="fixture" expires="2099-12-31" approved-by="sec"\n`,
      'utf-8'
    );

    const diffRes = verifySecrets({ rootDir: tmpDir, diff: true, gitleaks: false });
    expect(diffRes.success).toBe(true);

    const activeRes = verifySecrets({ rootDir: tmpDir, gitleaks: false, excludePatterns: ['src/ignored.ts'] });
    expect(activeRes.success).toBe(true);

    // Expired suppression -> blocks!
    fs.writeFileSync(
      path.join(tmpDir, 'src', 'expired-supp.ts'),
      `const k = "${fakeGhp}"; // ai-sdlc:allow-secret reason="old" expires="2020-01-01" approved-by="sec"\n`,
      'utf-8'
    );
    const expiredRes = verifySecrets({ rootDir: tmpDir, gitleaks: false });
    expect(expiredRes.success).toBe(false);
  });

  it('parseIngestedSbom: handles CycloneDX expression/name/id variants and SPDX packages with NOASSERTION', () => {
    const cdx = parseIngestedSbom({
      bomFormat: 'CycloneDX',
      components: [
        { name: 'a', version: '1.0.0', licenses: [{ expression: 'MIT OR Apache-2.0' }] },
        { name: 'b', version: '1.0.0', licenses: [{ license: { name: 'BSD-3-Clause' } }] },
        { name: 'c', version: '1.0.0', purl: 'pkg:pypi/c@2.0.0', licenses: [{ license: { id: 'ISC' } }] },
        { name: 'd', version: '1.0.0', licenses: [] },
      ],
    } as never);
    expect(cdx).toHaveLength(4);
    expect(cdx.find((x) => x.name === 'a')?.spdxLicense).toContain('MIT');

    const spdx = parseIngestedSbom({
      spdxVersion: 'SPDX-2.3',
      packages: [
        { name: 'spdx-pkg', versionInfo: '1.2.3', licenseConcluded: 'MIT', licenseDeclared: 'NOASSERTION' },
        { name: 'spdx-fallback', versionInfo: '0.1.0', licenseConcluded: 'NOASSERTION', licenseDeclared: 'Apache-2.0' },
        { name: 'spdx-none', versionInfo: '0.0.1', licenseConcluded: 'NOASSERTION', licenseDeclared: 'NOASSERTION' },
      ],
    } as never);
    expect(spdx).toHaveLength(3);
    expect(spdx.find((x) => x.name === 'spdx-fallback')?.spdxLicense).toBe('Apache-2.0');
    expect(spdx.find((x) => x.name === 'spdx-none')?.spdxLicense).toBe('UNKNOWN');
  });
});
