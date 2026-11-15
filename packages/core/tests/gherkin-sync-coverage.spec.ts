import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkGherkinInSync, extractGherkinFeatures } from '../src/verifiers/gherkin.js';

describe('Gherkin Extraction & Sync Branch Coverage Suite', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-gherkin-sync-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function write(rel: string, content: string): string {
    const full = path.join(tempDir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, 'utf-8');
    return full;
  }

  it('extracts gherkin features across security, privacy, custom target, and detects sync issues', () => {
    // Non-existent targetPath
    expect(checkGherkinInSync({ rootDir: tempDir, targetPath: 'does-not-exist.md' }).totalFeatures).toBe(0);

    // Security spec (single-quoted version)
    write(
      'specs/security/sec.md',
      "---\nid: SEC-001\nversion: '2.0.0'\n---\n```gherkin\nFeature: Sec\n  Scenario: Block\n    Given x\n```\n"
    );

    // Privacy spec (double-quoted version)
    write(
      'specs/privacy/priv.md',
      '---\nid: PRIV-001\nversion: "1.1.0"\n---\n```gherkin\nFeature: Priv\n  Scenario: Mask\n    Given y\n```\n'
    );

    // Custom cucumber-feature-file + no gherkin file
    write(
      'specs/product/custom.md',
      '---\ncucumber-feature-file: tests/features/custom-name.feature\n---\n```gherkin\nFeature: Custom\n  Escenario: Uno\n    Dado a\n```\n'
    );
    write('specs/product/no-gherkin.md', 'No frontmatter or gherkin here');

    // Before extraction: missingFiles should be reported
    const before = checkGherkinInSync({ rootDir: tempDir });
    expect(before.inSync).toBe(false);
    expect(before.missingFiles.length).toBe(3);

    // Extract all
    const extracted = extractGherkinFeatures({ rootDir: tempDir });
    expect(extracted.features).toHaveLength(3);
    expect(extracted.totalScenarios).toBe(3);

    // Extract single file targetPath
    const single = extractGherkinFeatures({ rootDir: tempDir, targetPath: 'specs/security/sec.md' });
    expect(single.features).toHaveLength(1);

    // Modify one extracted feature to trigger outOfSyncFiles + add an orphan feature
    write('tests/features/custom-name.feature', '# tampered\n');
    write('tests/features/nested/orphan.feature', 'Feature: Orphan\n');

    const after = checkGherkinInSync({ rootDir: tempDir });
    expect(after.inSync).toBe(false);
    expect(after.outOfSyncFiles).toContain('tests/features/custom-name.feature');
    expect(after.orphanFeatureFiles).toContain('tests/features/nested/orphan.feature');
    expect(after.missingStepFiles.length).toBeGreaterThan(0);
  });
});
