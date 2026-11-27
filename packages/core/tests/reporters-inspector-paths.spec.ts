import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { formatInspectResultMarkdown, inspectElement } from '../src/inspector/index.js';
import { buildGraphElements, classifyArtifactLayerAndType, scanWorkspaceArtifacts } from '../src/reporters/dashboard-graph.js';
import { calculateRating, detectLanguage, readCodeCoverageSummary } from '../src/reporters/quality-report.js';
import { generateSecuritySarifReport, writeSecuritySarifReport } from '../src/reporters/sarif.js';

describe('Reporters & Inspector Unit Paths (Happy / Sad / Boundary / Malformed)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-inc13-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('quality-report helpers: calculateRating (A-F), detectLanguage, readCodeCoverageSummary (happy/sad/boundary/malformed)', () => {
    expect(calculateRating(90, 2)).toBe('A');
    expect(calculateRating(72, 6)).toBe('B');
    expect(calculateRating(55, 10)).toBe('C');
    expect(calculateRating(42, 18)).toBe('D');
    expect(calculateRating(10, 30)).toBe('F');

    expect(detectLanguage('src/a.ts')).toBe('TypeScript');
    expect(detectLanguage('src/a.py')).toBe('Python');
    expect(detectLanguage('src/a.go')).toBe('Go');
    expect(detectLanguage('src/a.rs')).toBe('Rust');
    expect(detectLanguage('src/a.cs')).toBe('C#');
    expect(detectLanguage('src/a.java')).toBe('Java');
    expect(detectLanguage('README.txt')).toBe('Unknown');

    expect(readCodeCoverageSummary(tmpDir)).toBeNull();

    const covDir = path.join(tmpDir, 'coverage');
    fs.mkdirSync(covDir, { recursive: true });
    fs.writeFileSync(path.join(covDir, 'coverage-summary.json'), '{malformed-json', 'utf-8');
    expect(readCodeCoverageSummary(tmpDir)).toBeNull();

    fs.writeFileSync(
      path.join(covDir, 'coverage-summary.json'),
      JSON.stringify({
        total: {
          lines: { pct: 90 },
          branches: { pct: 85 },
          functions: { pct: 95 },
          statements: { pct: 90 },
        },
      }),
      'utf-8'
    );
    expect(readCodeCoverageSummary(tmpDir)).toMatchObject({ linesPct: 90, branchesPct: 85, functionsPct: 95 });
  });

  it('writeSecuritySarifReport: writes SARIF document to custom nested outputPath (happy)', () => {
    const outPath = path.join(tmpDir, 'nested', 'sec.sarif');
    const doc = generateSecuritySarifReport({ rootDir: tmpDir });
    writeSecuritySarifReport(outPath, doc);
    expect(fs.existsSync(outPath)).toBe(true);
    expect(JSON.parse(fs.readFileSync(outPath, 'utf-8')).version).toBe('2.1.0');
  });

  it('dashboard-graph & inspector: handles empty workspace, unknown queries, and markdown formatting (happy/sad/boundary)', async () => {
    const cls = classifyArtifactLayerAndType('specs/product/fr.md', { id: 'FR-001' });
    expect(cls).toBeDefined();

    const scanned = scanWorkspaceArtifacts(tmpDir);
    expect(scanned).toBeDefined();

    const graph = buildGraphElements(tmpDir);
    expect(Array.isArray(graph.elements)).toBe(true);

    const emptyInspect = await inspectElement('', { rootDir: tmpDir });
    expect(emptyInspect.found).toBe(false);
    expect(formatInspectResultMarkdown(emptyInspect)).toBeTruthy();

    const missingInspect = await inspectElement('NONEXISTENT-ID-999', { rootDir: tmpDir });
    expect(missingInspect.found).toBe(false);
    expect(formatInspectResultMarkdown(missingInspect)).toContain('NONEXISTENT-ID-999');

    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'sample.ts'), 'export const a = 1;\n', 'utf-8');
    const fileInspect = await inspectElement('src/sample.ts', { rootDir: tmpDir });
    expect(fileInspect.found).toBe(true);
    expect(formatInspectResultMarkdown(fileInspect)).toContain('sample.ts');
  });
});
