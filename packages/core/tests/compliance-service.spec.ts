import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ALL_QUALITY_GATES,
  generateComplianceEvidenceBundle,
  generateComplianceEvidenceBundleSync,
} from '../src/index.js';

describe('ComplianceService: Regulatory Evidence Bundle Generation', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-compliance-svc-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('generates bundle in non-strict dryRun mode without writing to disk', () => {
    const result = generateComplianceEvidenceBundleSync({
      rootDir: tempDir,
      currentCommit: 'abc1234567890',
      dryRun: true,
    });

    expect(result.success).toBe(true);
    expect(result.coveredGatesCount).toBe(12);
    expect(result.bundleDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(fs.existsSync(result.outputPath)).toBe(false);
    expect(result.regulatoryCoverage.euAiActArticles.length).toBeGreaterThan(0);
  });

  it('persists bundle to disk and ingests gate report files from reports/', async () => {
    const reportsDir = path.join(tempDir, 'reports');
    fs.mkdirSync(reportsDir, { recursive: true });
    const sha = 'deadbeef1234';

    for (const gate of ALL_QUALITY_GATES) {
      fs.writeFileSync(
        path.join(reportsDir, `${gate}-report.json`),
        JSON.stringify({
          gateId: gate,
          verdict: gate === 'quality' ? 'WARN' : 'PASS',
          commitSha: sha,
          findings: gate === 'quality' ? [{ rule: 'CC', severity: 'LOW', message: 'Sample finding' }] : [],
        }),
        'utf-8'
      );
    }

    const customOut = path.join(tempDir, 'out', 'bundle.json');
    const result = await generateComplianceEvidenceBundle({
      rootDir: tempDir,
      currentCommit: sha,
      outputPath: customOut,
      strict: true,
    });

    expect(result.success).toBe(true);
    expect(result.findingsCount).toBeGreaterThanOrEqual(1);
    expect(fs.existsSync(customOut)).toBe(true);
  });

  it('throws ERR_EVIDENCE_PROVENANCE_STALE when a report commitSha does not match HEAD', () => {
    const reportsDir = path.join(tempDir, 'reports');
    fs.mkdirSync(reportsDir, { recursive: true });
    fs.writeFileSync(
      path.join(reportsDir, 'quality-report.json'),
      JSON.stringify({ verdict: 'PASS', commitSha: 'old-sha' }),
      'utf-8'
    );

    expect(() =>
      generateComplianceEvidenceBundleSync({
        rootDir: tempDir,
        currentCommit: 'new-sha',
      })
    ).toThrow(/ERR_EVIDENCE_PROVENANCE_STALE/);
  });
});
