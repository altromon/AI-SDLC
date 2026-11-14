import { describe, expect, it } from 'vitest';
import { ScaSbomError } from '../src/verifiers/sca/sbom-ingest.js';
import { parseIngestedSbom } from '../src/verifiers/sca/sbom-parse.js';

describe('CHG-056 TSK-002: sbom-parse CycloneDX/SPDX extraction, strict PURL & license precedence', () => {
  it('parses CycloneDX 1.x components, excludes metadata.component, and sorts canonically', () => {
    const doc = {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      version: 1,
      metadata: {
        component: {
          type: 'application',
          name: 'my-root-app',
          version: '0.1.0',
          purl: 'pkg:npm/my-root-app@0.1.0',
        },
      },
      components: [
        {
          type: 'library',
          name: 'zod',
          version: '3.23.8',
          purl: 'pkg:npm/zod@3.23.8',
          licenses: [{ license: { id: 'MIT' } }],
        },
        {
          type: 'library',
          name: 'axios',
          version: '1.7.0',
          purl: 'pkg:npm/axios@1.7.0',
          licenses: [{ expression: 'MIT' }],
        },
      ],
    };

    const result = parseIngestedSbom(doc);
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.name)).toEqual(['axios', 'zod']);
    expect(result[0]).toMatchObject({
      ecosystem: 'npm',
      name: 'axios',
      version: '1.7.0',
      spdxLicense: 'MIT',
    });
    expect(result.find((c) => c.name === 'my-root-app')).toBeUndefined();
  });

  it('parses SPDX 2.x packages, excludes root document package, and applies license precedence', () => {
    const doc = {
      spdxVersion: 'SPDX-2.3',
      SPDXID: 'SPDXRef-DOCUMENT',
      name: 'spdx-doc',
      documentDescribes: ['SPDXRef-Root'],
      packages: [
        {
          SPDXID: 'SPDXRef-Root',
          name: 'root-app',
          versionInfo: '1.0.0',
          licenseConcluded: 'MIT',
        },
        {
          SPDXID: 'SPDXRef-Pkg-1',
          name: 'requests',
          versionInfo: '2.31.0',
          licenseConcluded: 'Apache-2.0',
          licenseDeclared: 'MIT',
          externalRefs: [
            {
              referenceCategory: 'PACKAGE-MANAGER',
              referenceType: 'purl',
              referenceLocator: 'pkg:pypi/requests@2.31.0',
            },
          ],
        },
      ],
    };

    const result = parseIngestedSbom(doc);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      ecosystem: 'pypi',
      name: 'requests',
      version: '2.31.0',
      spdxLicense: 'Apache-2.0',
    });
  });

  it.each(['NOASSERTION', 'NONE', '', 'LicenseRef-custom-proprietary'])(
    'normalizes non-assertive SPDX license "%s" to UNKNOWN',
    (rawLicense) => {
      const doc = {
        spdxVersion: 'SPDX-2.3',
        SPDXID: 'SPDXRef-DOCUMENT',
        packages: [
          {
            SPDXID: 'SPDXRef-Pkg-1',
            name: 'lib',
            versionInfo: '1.0.0',
            licenseConcluded: rawLicense,
            licenseDeclared: rawLicense,
          },
        ],
      };

      const result = parseIngestedSbom(doc);
      expect(result).toHaveLength(1);
      expect(result[0].spdxLicense).toBe('UNKNOWN');
    }
  );

  it('sanitizes malicious licenses containing ANSI escapes or exceeding 200 chars to UNKNOWN', () => {
    const longLicense = 'A'.repeat(201);
    const doc = {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      components: [
        {
          type: 'library',
          name: 'ansi-pkg',
          version: '1.0.0',
          licenses: [{ license: { name: '\u001b[31mMIT\u001b[0m' } }],
        },
        {
          type: 'library',
          name: 'long-pkg',
          version: '1.0.0',
          licenses: [{ license: { name: longLicense } }],
        },
      ],
    };

    const result = parseIngestedSbom(doc);
    expect(result.find((c) => c.name === 'ansi-pkg')?.spdxLicense).toBe('UNKNOWN');
    expect(result.find((c) => c.name === 'long-pkg')?.spdxLicense).toBe('UNKNOWN');
  });

  it('deduplicates components by ecosystem+namespace+name+version and parses strict PURLs', () => {
    const doc = {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      components: [
        {
          type: 'library',
          name: '@scope/pkg',
          version: '1.0.0',
          purl: 'pkg:npm/%40scope/pkg@1.0.0',
          licenses: [{ license: { id: 'MIT' } }],
        },
        {
          type: 'library',
          name: '@scope/pkg',
          version: '1.0.0',
          purl: 'pkg:npm/%40scope/pkg@1.0.0',
          licenses: [{ license: { id: 'MIT' } }],
        },
        {
          type: 'library',
          name: 'lib',
          version: '2.0.0',
          purl: 'pkg:maven/com.acme/lib@2.0.0',
          licenses: [{ license: { id: 'Apache-2.0' } }],
        },
      ],
    };

    const result = parseIngestedSbom(doc);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      ecosystem: 'maven',
      namespace: 'com.acme',
      name: 'lib',
      version: '2.0.0',
    });
    expect(result[1]).toMatchObject({
      ecosystem: 'npm',
      namespace: '@scope',
      name: 'pkg',
      version: '1.0.0',
    });
  });

  it('throws ERR_SBOM_EMPTY when SBOM contains zero non-root components', () => {
    const doc = {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      metadata: {
        component: { type: 'application', name: 'root', version: '1.0.0' },
      },
      components: [],
    };

    try {
      parseIngestedSbom(doc);
      expect.fail('Expected ScaSbomError');
    } catch (err) {
      expect(err).toBeInstanceOf(ScaSbomError);
      expect((err as ScaSbomError).code).toBe('ERR_SBOM_EMPTY');
    }
  });
});
