import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  generateCycloneDxSbom,
  resolveDeterministicDate,
  generateDeterministicUuidV5,
  canonicalSort,
  walkMdFiles,
  walkDir,
  stripVolatileReportMetadata,
  isReportContentSemanticallyEqual,
  writeReportFileIfChanged,
} from '../src/index.js';
import { ScannedDependency } from '../src/types/index.js';

describe('Deterministic Reproducibility & Canonical Ordering Engine (ENT-01)', () => {
  const originalEnv = process.env.SOURCE_DATE_EPOCH;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-reproducibility-'));
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.SOURCE_DATE_EPOCH = originalEnv;
    } else {
      delete process.env.SOURCE_DATE_EPOCH;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Deterministic Date & SOURCE_DATE_EPOCH', () => {
    it('should respect SOURCE_DATE_EPOCH when set in unix epoch seconds', () => {
      // 1700000000 = 2023-11-14T22:13:20.000Z
      process.env.SOURCE_DATE_EPOCH = '1700000000';
      const date = resolveDeterministicDate(tempDir);
      expect(date.toISOString()).toBe('2023-11-14T22:13:20.000Z');
    });

    it('should return a valid Date instance when SOURCE_DATE_EPOCH is not set', () => {
      delete process.env.SOURCE_DATE_EPOCH;
      const date = resolveDeterministicDate(tempDir);
      expect(date).toBeInstanceOf(Date);
      expect(isNaN(date.getTime())).toBe(false);
    });
  });

  describe('Deterministic UUIDv5 Generator', () => {
    it('should generate an RFC 4122 compliant UUIDv5 deterministically', () => {
      const uuid1 = generateDeterministicUuidV5('project@1.0.0;dep-a@1.0.0');
      const uuid2 = generateDeterministicUuidV5('project@1.0.0;dep-a@1.0.0');
      expect(uuid1).toBe(uuid2);

      // Verify UUIDv5 format: version 5 (nibble 13 is '5'), variant RFC 4122 (nibble 17 is '8', '9', 'a', or 'b')
      const uuidV5Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuidV5Regex.test(uuid1)).toBe(true);
    });

    it('should generate different UUIDv5 values for different names', () => {
      const uuid1 = generateDeterministicUuidV5('pkg-a@1.0.0');
      const uuid2 = generateDeterministicUuidV5('pkg-b@1.0.0');
      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('CycloneDX SBOM Deterministic Reproducibility', () => {
    const dependencies: ScannedDependency[] = [
      { name: 'typescript', version: '5.4.0', license: 'Apache-2.0', purl: 'pkg:npm/typescript@5.4.0' },
      { name: 'picocolors', version: '1.0.0', license: 'ISC', purl: 'pkg:npm/picocolors@1.0.0' },
    ];

    it('should produce 100% byte-for-byte identical CycloneDX SBOM on repeated invocations with fixed timestamp', () => {
      process.env.SOURCE_DATE_EPOCH = '1700000000';

      const sbom1 = generateCycloneDxSbom(dependencies, { rootDir: tempDir });
      const sbom2 = generateCycloneDxSbom(dependencies, { rootDir: tempDir });

      expect(JSON.stringify(sbom1)).toBe(JSON.stringify(sbom2));
      expect(sbom1.serialNumber).toBe(sbom2.serialNumber);
      expect(sbom1.metadata.timestamp).toBe('2023-11-14T22:13:20.000Z');
      expect(sbom1.metadata.timestamp).toBe(sbom2.metadata.timestamp);
    });

    it('should produce deterministic serialNumber derived from project and dependency components', () => {
      const sbomA1 = generateCycloneDxSbom(dependencies, { rootDir: tempDir });
      const sbomA2 = generateCycloneDxSbom(dependencies, { rootDir: tempDir });
      expect(sbomA1.serialNumber).toBe(sbomA2.serialNumber);

      const modifiedDeps: ScannedDependency[] = [
        ...dependencies,
        { name: 'zod', version: '3.22.4', license: 'MIT', purl: 'pkg:npm/zod@3.22.4' },
      ];
      const sbomB = generateCycloneDxSbom(modifiedDeps, { rootDir: tempDir });
      expect(sbomA1.serialNumber).not.toBe(sbomB.serialNumber);
    });
  });

  describe('Canonical Filesystem Sorting (UTF-8 Codepoint)', () => {
    it('should sort strings strictly by Unicode codepoint order', () => {
      const unsorted = ['b', 'A', '1', 'a', 'B', '2', 'aa', 'a1'];
      const sorted = [...unsorted].sort(canonicalSort);
      expect(sorted).toEqual(['1', '2', 'A', 'B', 'a', 'a1', 'aa', 'b']);
    });

    it('should return walkMdFiles strictly sorted by codepoint', () => {
      // Create files in arbitrary order
      fs.writeFileSync(path.join(tempDir, 'zebra.md'), '# Zebra');
      fs.writeFileSync(path.join(tempDir, 'apple.md'), '# Apple');
      fs.writeFileSync(path.join(tempDir, 'Banana.md'), '# Banana');
      fs.writeFileSync(path.join(tempDir, 'carrot.md'), '# Carrot');

      const files = walkMdFiles(tempDir);
      const baseNames = files.map((f) => path.basename(f));
      expect(baseNames).toEqual(['Banana.md', 'apple.md', 'carrot.md', 'zebra.md']);
    });

    it('should return walkDir strictly sorted by codepoint', () => {
      fs.writeFileSync(path.join(tempDir, 'z.ts'), 'export const z = 1;');
      fs.writeFileSync(path.join(tempDir, 'a.ts'), 'export const a = 1;');
      fs.writeFileSync(path.join(tempDir, 'M.ts'), 'export const M = 1;');

      const files = walkDir(tempDir, ['.ts']);
      const baseNames = files.map((f) => path.basename(f));
      expect(baseNames).toEqual(['M.ts', 'a.ts', 'z.ts']);
    });
  });

  describe('Semantic Report Equality & Idempotent Writer (PR Anti-Conflict)', () => {
    it('should strip volatile dates from markdown and html reports correctly', () => {
      const mdReport = [
        '# Quality Report',
        '',
        '> **Generation Date:** 2026-10-30T17:46:21.000Z',
        '> **Release Gate Verdict:** PASS',
        '',
        '| Metric | Value |',
        '| :--- | :--- |',
        '| LOC | 1000 |',
      ].join('\n');

      const stripped = stripVolatileReportMetadata(mdReport);
      expect(stripped).not.toContain('2026-10-30T17:46:21.000Z');
      expect(stripped).toContain('> **Release Gate Verdict:** PASS');
      expect(stripped).toContain('| LOC | 1000 |');

      const htmlDashboard = '<div>Generated: <span>2026-10-30 17:47:48</span></div><p>Content</p>';
      const strippedHtml = stripVolatileReportMetadata(htmlDashboard);
      expect(strippedHtml).toBe('<div>Generated: <span>[STRIPPED]</span></div><p>Content</p>');
    });

    it('should detect semantic equality in Markdown when only date changes', () => {
      const docA = [
        '# Quality Report',
        '> **Generation Date:** 2026-10-30T17:46:21.000Z',
        '> **Release Gate Verdict:** PASS',
        '## Metrics',
        'Maintainability: 85',
      ].join('\n');

      const docB = [
        '# Quality Report',
        '> **Generation Date:** 2026-10-30T18:11:10.000Z',
        '> **Release Gate Verdict:** PASS',
        '## Metrics',
        'Maintainability: 85',
      ].join('\n');

      const docC = [
        '# Quality Report',
        '> **Generation Date:** 2026-10-30T18:11:10.000Z',
        '> **Release Gate Verdict:** PASS',
        '## Metrics',
        'Maintainability: 70',
      ].join('\n');

      expect(isReportContentSemanticallyEqual(docA, docB, 'reports/QUALITY_REPORT.md')).toBe(true);
      expect(isReportContentSemanticallyEqual(docA, docC, 'reports/QUALITY_REPORT.md')).toBe(false);
    });

    it('should detect semantic equality in CycloneDX SBOM when only timestamp changes', () => {
      const sbomA = JSON.stringify({
        bomFormat: 'CycloneDX',
        specVersion: '1.5',
        version: 1,
        serialNumber: 'urn:uuid:test-1234',
        metadata: { timestamp: '2026-10-30T17:00:00.000Z' },
        components: [{ name: 'pkg-a', version: '1.0.0' }],
      });

      const sbomB = JSON.stringify({
        bomFormat: 'CycloneDX',
        specVersion: '1.5',
        version: 1,
        serialNumber: 'urn:uuid:test-1234',
        metadata: { timestamp: '2026-10-30T18:00:00.000Z' },
        components: [{ name: 'pkg-a', version: '1.0.0' }],
      });

      const sbomC = JSON.stringify({
        bomFormat: 'CycloneDX',
        specVersion: '1.5',
        version: 1,
        serialNumber: 'urn:uuid:test-different',
        metadata: { timestamp: '2026-10-30T18:00:00.000Z' },
        components: [{ name: 'pkg-a', version: '2.0.0' }],
      });

      expect(isReportContentSemanticallyEqual(sbomA, sbomB, 'reports/sbom.cdx.json')).toBe(true);
      expect(isReportContentSemanticallyEqual(sbomA, sbomC, 'reports/sbom.cdx.json')).toBe(false);
    });

    it('should not overwrite report on disk when semantic content is identical', () => {
      const targetFile = path.join(tempDir, 'reports', 'QUALITY_REPORT.md');

      const initialContent = [
        '# Quality Report',
        '> **Generation Date:** 2026-10-30T17:46:21.000Z',
        '> **Release Gate Verdict:** PASS',
        'Metrics: 100',
      ].join('\n');

      // 1. Initial write
      const wroteFirst = writeReportFileIfChanged(targetFile, initialContent);
      expect(wroteFirst).toBe(true);
      expect(fs.existsSync(targetFile)).toBe(true);

      const statBefore = fs.statSync(targetFile);

      // 2. Second write with different timestamp only
      const updatedTimestampContent = [
        '# Quality Report',
        '> **Generation Date:** 2026-10-30T18:11:10.000Z',
        '> **Release Gate Verdict:** PASS',
        'Metrics: 100',
      ].join('\n');

      const wroteSecond = writeReportFileIfChanged(targetFile, updatedTimestampContent);
      expect(wroteSecond).toBe(false); // Skipped write!

      const statAfter = fs.statSync(targetFile);
      expect(statAfter.mtimeMs).toBe(statBefore.mtimeMs);

      // Verify file content still preserves original timestamp on disk
      const diskContent = fs.readFileSync(targetFile, 'utf-8');
      expect(diskContent).toContain('2026-10-30T17:46:21.000Z');

      // 3. Third write with modified metric
      const modifiedContent = [
        '# Quality Report',
        '> **Generation Date:** 2026-10-30T18:11:10.000Z',
        '> **Release Gate Verdict:** PASS',
        'Metrics: 95',
      ].join('\n');

      const wroteThird = writeReportFileIfChanged(targetFile, modifiedContent);
      expect(wroteThird).toBe(true); // Content changed, wrote!
      const finalDiskContent = fs.readFileSync(targetFile, 'utf-8');
      expect(finalDiskContent).toContain('Metrics: 95');
      expect(finalDiskContent).toContain('2026-10-30T18:11:10.000Z');
    });
  });
});
