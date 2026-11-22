import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { formatReleaseKpiMarkdown, writeReleaseKpiReport } from '../src/reporters/release-kpis.js';
import type { ReleaseKpiReport } from '../src/types/index.js';
import {
  buildCycloneDxComponent,
  buildCycloneDxVulnerabilities,
  generateCycloneDxSbom,
  generateThirdPartyNotices,
  writeCycloneDxSbom,
  writeThirdPartyNotices,
} from '../src/verifiers/sca/sbom.js';
import { parseIngestedSbom, parseStrictPurl, sanitizeSbomLicense } from '../src/verifiers/sca/sbom-parse.js';

describe('SCA SBOM & Release KPI Paths (Happy / Sad / Boundary / Malformed)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-sbom-kpi-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('SBOM builders & writers: builds components, vulnerabilities, notices, and writes files (happy/boundary)', () => {
    const comp = buildCycloneDxComponent({
      name: 'zod',
      version: '3.22.4',
      license: 'MIT',
      purl: 'pkg:npm/zod@3.22.4',
    });
    expect(comp.name).toBe('zod');
    expect(comp.licenses?.[0]).toBeDefined();

    const unknownComp = buildCycloneDxComponent({ name: 'anon', version: '0.0.0', license: '' });
    expect(unknownComp.name).toBe('anon');

    const vulns = buildCycloneDxVulnerabilities([
      {
        id: 'CVE-2025-0001',
        packageName: 'zod',
        packageVersion: '3.22.4',
        severity: 'HIGH',
        cvssScore: 7.5,
        title: 'Sample CVE',
        purl: 'pkg:npm/zod@3.22.4',
      },
    ]);
    expect(vulns).toHaveLength(1);
    expect(buildCycloneDxVulnerabilities([])).toEqual([]);

    const sbom = generateCycloneDxSbom([{ name: 'zod', version: '3.22.4', license: 'MIT' }], { rootDir: tmpDir });
    const sbomPath = path.join(tmpDir, 'out', 'sbom.cdx.json');
    writeCycloneDxSbom(sbom, sbomPath);
    expect(fs.existsSync(sbomPath)).toBe(true);

    const notices = generateThirdPartyNotices([{ name: 'zod', version: '3.22.4', license: 'MIT' }]);
    const noticesPath = path.join(tmpDir, 'out', 'THIRD_PARTY_NOTICES.md');
    writeThirdPartyNotices(notices, noticesPath);
    expect(fs.readFileSync(noticesPath, 'utf-8')).toContain('zod');
  });

  it('sbom-parse: parseStrictPurl, sanitizeSbomLicense, and parseIngestedSbom handle valid, empty, and malformed inputs (happy/boundary/malformed)', () => {
    expect(parseStrictPurl('pkg:npm/%40scope/pkg@1.0.0')).toMatchObject({
      ecosystem: 'npm',
      namespace: '@scope',
      name: 'pkg',
      version: '1.0.0',
    });
    expect(parseStrictPurl('')).toBeNull();
    expect(parseStrictPurl('not-a-purl')).toBeNull();
    expect(parseStrictPurl('pkg:npm/pkg@1.0.0?bad=%ZZ')).not.toBeNull();

    expect(sanitizeSbomLicense('MIT')).toBe('MIT');
    expect(sanitizeSbomLicense('')).toBe('UNKNOWN');
    expect(sanitizeSbomLicense(null)).toBe('UNKNOWN');

    expect(() => parseIngestedSbom({} as never)).toThrow('ERR_SBOM_EMPTY');
    const parsed = parseIngestedSbom({
      bomFormat: 'CycloneDX',
      components: [{ name: 'lodash', version: '4.17.21', licenses: [{ license: { id: 'MIT' } }] }],
    } as never);
    expect(parsed).toHaveLength(1);
  });

  it('Release KPIs: formatReleaseKpiMarkdown & writeReleaseKpiReport handle populated and empty bug/task lists (happy/boundary)', () => {
    const report: ReleaseKpiReport = {
      releaseBranch: 'release/v1.0.0',
      baseBranch: 'main',
      generatedAt: '2026-01-01T00:00:00.000Z',
      totalCommits: 5,
      totalLinesAdded: 200,
      totalLinesDeleted: 50,
      totalKloc: 0.2,
      totalBugs: 1,
      globalDefectDensity: 5,
      totalTimeSeconds: 3600,
      totalTokens: 10000,
      totalCostUsd: 0.5,
      reworkCommits: 1,
      reworkTimeSeconds: 600,
      reworkTimePercent: 16.7,
      reworkTokens: 1500,
      reworkTokensPercent: 15,
      reworkCostUsd: 0.1,
      authorStats: [
        {
          authorOrModel: 'Gemini',
          commits: 5,
          klocProduced: 0.2,
          bugsInjected: 1,
          defectInjectionRate: 5,
          totalTimeSeconds: 3600,
          totalTokens: 10000,
          estimatedCostUsd: 0.5,
        },
      ],
      bugList: [
        {
          sha: 'abc1234',
          subject: 'fix: edge case',
          author: 'Gemini',
          parentRef: 'CHG-001',
          timeSeconds: 600,
          tokens: 1500,
        },
      ],
      taskReworkStats: [
        {
          taskId: 'TSK-001',
          parentRef: 'CHG-001',
          commits: 2,
          reworkCommits: 1,
          totalTokens: 5000,
          reworkTokens: 1500,
          totalTimeSeconds: 1800,
          reworkTimeSeconds: 600,
        },
      ],
    };

    const md = formatReleaseKpiMarkdown(report);
    expect(md).toContain('fix: edge case');
    expect(md).toContain('TSK-001');

    const { markdownPath, jsonPath } = writeReleaseKpiReport(report, { rootDir: tmpDir });
    expect(fs.existsSync(markdownPath)).toBe(true);
    expect(fs.existsSync(jsonPath)).toBe(true);
  });
});
