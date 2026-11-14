import { describe, expect, it } from 'vitest';
import {
  buildCycloneDxVulnerabilities,
  generateCycloneDxSbom,
} from '../src/verifiers/sca/sbom.js';
import {
  parseTrivyOutput,
  parseTrivyVulnerabilities,
} from '../src/verifiers/sca/scanner.js';
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

  it('falls back to pkg:generic (never pkg:npm/) when v.ecosystem and dep.purl are undefined', () => {
    const deps: ScannedDependency[] = [
      { name: 'custom-lib', version: '1.2.3', spdxLicense: 'MIT' },
    ];
    const vulns: ScaVulnerability[] = [
      {
        id: 'CVE-2026-9999',
        packageName: 'custom-lib',
        installedVersion: '1.2.3',
        severity: 'HIGH',
      },
    ];

    const sbom = generateCycloneDxSbom(deps, {
      projectName: 'generic-fallback-app',
      vulnerabilities: vulns,
    });

    expect(sbom.components[0].purl).toBe('pkg:generic/custom-lib@1.2.3');
    expect(sbom.components[0].purl?.startsWith('pkg:npm/')).toBe(false);
    expect(sbom.vulnerabilities?.[0].affects?.[0]?.ref).toBe('pkg:generic/custom-lib@1.2.3');
    expect(sbom.vulnerabilities?.[0].affects?.[0]?.ref.startsWith('pkg:npm/')).toBe(false);
  });

  it('links parseTrivyVulnerabilities + parseTrivyOutput -> generateCycloneDxSbom with matching PURLs', () => {
    const trivyJson = JSON.stringify({
      Results: [
        {
          Type: 'gomod',
          Packages: [
            {
              Name: 'github.com/gin-gonic/gin',
              Version: 'v1.9.1',
              Licenses: ['MIT', 'GPL-3.0-only'],
              Identifier: { PURL: 'pkg:golang/github.com/gin-gonic/gin@v1.9.1' },
            },
          ],
          Vulnerabilities: [
            {
              VulnerabilityID: 'CVE-2026-1234',
              PkgName: 'github.com/gin-gonic/gin',
              InstalledVersion: 'v1.9.1',
              Severity: 'HIGH',
              PkgIdentifier: { PURL: 'pkg:golang/github.com/gin-gonic/gin@v1.9.1' },
            },
          ],
        },
      ],
    });

    const deps = parseTrivyOutput(trivyJson);
    const vulns = parseTrivyVulnerabilities(trivyJson);
    const sbom = generateCycloneDxSbom(deps, {
      projectName: 'trivy-e2e-app',
      vulnerabilities: vulns,
    });

    expect(deps[0].spdxLicense).toBe('MIT AND GPL-3.0-only');
    expect(vulns[0].ecosystem).toBe('gomod');
    expect(vulns[0].purl).toBe('pkg:golang/github.com/gin-gonic/gin@v1.9.1');
    expect(sbom.components).toHaveLength(1);
    expect(sbom.vulnerabilities).toHaveLength(1);
    expect(sbom.vulnerabilities?.[0].affects?.[0]?.ref).toBe(sbom.components[0].purl);
  });
});
