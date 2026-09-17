import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  buildGraphElements,
  collectDashboardMetrics,
  collectHistoricalKpis,
  generateDashboardReport,
  getCytoscapeScript,
  resolveCytoscapePath,
} from '../src/index.js';

describe('AI-SDLC Interactive Web Dashboard & Cytoscape Graph', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-dash-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore windows cleanup locks
      }
    }
  });

  it('should resolve and load Cytoscape.js standalone script', () => {
    const scriptPath = resolveCytoscapePath();
    expect(scriptPath).toBeTruthy();
    expect(fs.existsSync(scriptPath!)).toBe(true);

    const scriptContent = getCytoscapeScript();
    expect(scriptContent).toBeTruthy();
    expect(scriptContent.length).toBeGreaterThan(10000);
    expect(scriptContent).toContain('cytoscape');
  });

  it('should build graph elements categorizing into 4 canonical layers', () => {
    const rootDir = process.cwd();
    const result = buildGraphElements(rootDir);

    expect(result.elements).toBeDefined();
    expect(result.elements.length).toBeGreaterThan(0);

    const nodes = result.elements.filter((e) => e.group === 'nodes');
    const edges = result.elements.filter((e) => e.group === 'edges');

    expect(nodes.length).toBeGreaterThan(0);
    expect(edges.length).toBeGreaterThan(0);

    // Verify presence of layers
    expect(result.nodesByLayer.product).toBeGreaterThanOrEqual(0);
    expect(result.nodesByLayer.requirement).toBeGreaterThanOrEqual(0);
    expect(result.nodesByLayer.architecture).toBeGreaterThanOrEqual(0);
    expect(result.nodesByLayer.test).toBeGreaterThanOrEqual(0);

    // Verify node structure
    for (const node of nodes) {
      const data = node.data as any;
      expect(data.id).toBeTruthy();
      expect(data.layer).toBeDefined();
      expect(['product', 'requirement', 'architecture', 'test']).toContain(data.layer);
      expect(['CONFORME', 'HUÉRFANO', 'DRIFT', 'REVIEW']).toContain(data.status);
    }
  });

  it('should collect metrics including quality gate, governance, and testing coverage', () => {
    const rootDir = process.cwd();
    const metrics = collectDashboardMetrics(rootDir);

    expect(metrics.gate).toBeDefined();
    expect(metrics.gov).toBeDefined();
    expect(metrics.cov).toBeDefined();
    expect(metrics.trace).toBeDefined();
    expect(metrics.history).toBeDefined();
    expect(Array.isArray(metrics.history)).toBe(true);
  });

  it('should parse historical release KPIs when reports/releases/*.kpis.json exist', () => {
    const mockReportsDir = path.join(tempDir, 'reports', 'releases');
    fs.mkdirSync(mockReportsDir, { recursive: true });

    const mockReport = {
      releaseBranch: 'release/v1.0.0',
      baseBranch: 'main',
      generatedAt: '2026-09-17T12:00:00Z',
      totalCommits: 15,
      totalLinesAdded: 2500,
      totalLinesDeleted: 200,
      totalKloc: 2.3,
      totalBugs: 1,
      globalDefectDensity: 0.43,
      totalTimeSeconds: 7200,
      totalTokens: 150000,
      totalCostUsd: 2.85,
      reworkTimeSeconds: 360,
      reworkTokens: 10000,
      reworkCostUsd: 0.2,
      reworkTimePercent: 5.0,
      reworkTokensPercent: 6.67,
      reworkCostPercent: 7.02,
      authorStats: [],
      bugList: [],
    };

    fs.writeFileSync(
      path.join(mockReportsDir, 'release_v1.0.0.kpis.json'),
      JSON.stringify(mockReport, null, 2),
      'utf-8'
    );

    const history = collectHistoricalKpis(tempDir);
    expect(history.length).toBe(1);
    expect(history[0].id).toBe('release/v1.0.0');
    expect(history[0].kloc).toBe(2.3);
    expect(history[0].bugs).toBe(1);
    expect(history[0].defectDensity).toBe(0.43);
  });

  it('should generate a complete, standalone, self-contained HTML dashboard', () => {
    const outputPath = path.join(tempDir, 'reports', 'test-dashboard.html');
    const result = generateDashboardReport({
      rootDir: process.cwd(),
      outputPath,
      title: 'Custom Test AI-SDLC Dashboard',
    });

    expect(result.outputPath).toBe(outputPath);
    expect(fs.existsSync(outputPath)).toBe(true);

    const htmlContent = fs.readFileSync(outputPath, 'utf-8');
    expect(htmlContent).toContain('<!DOCTYPE html>');
    expect(htmlContent).toContain('Custom Test AI-SDLC Dashboard');
    expect(htmlContent).toContain('cytoscape');
    expect(htmlContent).toContain('id="cy"');
    expect(htmlContent).toContain('highlightCriticalPath');
    expect(htmlContent).toContain('Matriz de Trazabilidad de Requerimientos 360°');
    expect(htmlContent).toContain('Distribución de Modos de Autonomía de Tareas');
    expect(htmlContent).toContain('Telemetría Activa e Histórico de KPIs');

    // Verify it is larger than 100KB due to bundled Cytoscape library
    expect(htmlContent.length).toBeGreaterThan(100000);
  });
});
