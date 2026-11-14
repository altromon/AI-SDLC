import { describe, expect, it } from 'vitest';
import {
  buildCycloneDxVulnerabilities,
  generateCycloneDxSbom,
} from '../src/verifiers/sca/sbom.js';
import type { ScaVulnerability, ScannedDependency } from '../src/types/index.js';

describe('CHG-054 TSK-003: CycloneDX SBOM vulnerability affects[].ref PURL fidelity', () => {
  it.each([
    {
      ecosystem: 'maven',
      depName: 'com.acme:lib',
      version: '1.0',
      expectedPurl: 'pkg:maven/com.acme/lib@1.0',
    },
    {
      ecosystem: 'pypi',
      depName: 'Requests',
      version: '2.0.0',
      expectedPurl: 'pkg:pypi/requests@2.0.0',
    },
    {
      ecosystem: 'cargo',
      depName: 'serde',
      version: '1.0.197',
      expectedPurl: 'pkg:cargo/serde@1.0.197',
    },
    {
      ecosystem: 'npm',
      depName: '@scope/pkg',
      version: '1.0.0',
      expectedPurl: 'pkg:npm/%40scope/pkg@1.0.0',
    },
  ])(
    'matches affects[].ref to component purl for $ecosystem ($depName)',
    ({ ecosystem, depName, version, expectedPurl }) => {
      const deps: ScannedDependency[] = [
        {
          name: depName,
          version,
          spdxLicense: 'MIT',
          purl: expectedPurl,
        },
      ];
      const vulns: ScaVulnerability[] = [
        {
          id: 'CVE-2026-0001',
          packageName: depName,
          installedVersion: version,
          severity: 'HIGH',
          ecosystem,
        },
      ];

      const sbom = generateCycloneDxSbom(deps, {
        projectName: 'polyglot-app',
        vulnerabilities: vulns,
      });

      expect(sbom.components).toHaveLength(1);
      expect(sbom.components[0].purl).toBe(expectedPurl);
      expect(sbom.vulnerabilities).toHaveLength(1);
      expect(sbom.vulnerabilities?.[0].affects?.[0]?.ref).toBe(sbom.components[0].purl);
      if (ecosystem !== 'npm') {
        expect(sbom.vulnerabilities?.[0].affects?.[0]?.ref.startsWith('pkg:npm/')).toBe(false);
      }
    }
  );

  it('uses explicit ScaVulnerability.purl when provided in buildCycloneDxVulnerabilities', () => {
    const vulns: ScaVulnerability[] = [
      {
        id: 'CVE-2026-0002',
        packageName: 'com.acme:lib',
        installedVersion: '1.0',
        severity: 'CRITICAL',
        ecosystem: 'maven',
        purl: 'pkg:maven/com.acme/lib@1.0',
      },
    ];

    const cdxVulns = buildCycloneDxVulnerabilities(vulns);

    expect(cdxVulns).toHaveLength(1);
    expect(cdxVulns[0].affects?.[0]?.ref).toBe('pkg:maven/com.acme/lib@1.0');
  });
});
