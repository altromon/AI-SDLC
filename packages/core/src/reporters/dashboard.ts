/**
 * AI-SDLC: Interactive Web Dashboard & Cytoscape Graph Generator
 * Compiles PDaC Graph, RTM 360° Matrix, Quality Gate metrics, and KPI telemetry into
 * a standalone, zero-infrastructure, offline-ready HTML dashboard (reports/dashboard.html).
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import {
  CytoscapeEdgeData,
  CytoscapeElement,
  CytoscapeNodeData,
  DashboardHistoricalKpi,
  DashboardOptions,
  DashboardResult,
  GraphNodeLayer,
  GraphNodeStatus,
} from '../types/index.js';
import { ReleaseKpiReport } from './release-kpis.js';
import { verifyPdacGraph } from '../verifiers/pdac-graph.js';
import { verifyTraceability } from '../verifiers/traceability.js';
import { verifyQualityGate } from '../verifiers/quality-gate.js';
import { verifyTasksGovernance } from '../verifiers/governance.js';
import { verifyTestingCoverage } from '../verifiers/testing-coverage.js';
import { aggregatePrKpis } from './pr-kpis.js';
import { getCytoscapeScript } from './cytoscape-bundle.js';

export interface GraphElementsResult {
  elements: CytoscapeElement[];
  nodesByLayer: Record<GraphNodeLayer, number>;
  conformingCount: number;
  issueCount: number;
}

/**
 * Builds the graph elements (nodes & edges) for Cytoscape.js.
 */
export function buildGraphElements(rootDir: string = process.cwd()): GraphElementsResult {
  const pdac = verifyPdacGraph({ rootDir });
  const trace = verifyTraceability({ rootDir });

  const nodeMap = new Map<string, CytoscapeNodeData>();
  const edges: CytoscapeEdgeData[] = [];
  const driftTargets = new Set(pdac.drifts.map((d) => d.targetId));

  // 1. Process PDaC Baseline Nodes (Product, Handoffs, Architecture)
  for (const n of pdac.drifts) {
    driftTargets.add(n.targetId);
  }

  // 2. Process Traceability Requirements
  for (const r of trace.rows) {
    const isOk = r.productStatus === 'CONFORME' && r.archStatus === 'CONFORME' && r.testStatus === 'CONFORME';
    const status: GraphNodeStatus = isOk ? 'CONFORME' : 'HUÉRFANO';
    nodeMap.set(r.id, {
      id: r.id,
      label: r.id,
      title: r.title,
      type: r.type || 'requirement',
      layer: 'requirement',
      status,
      details: {
        productStatus: r.productStatus,
        archStatus: r.archStatus,
        testStatus: r.testStatus,
        hofId: r.hofId,
      },
      upstream: r.productTraces.split(',').map((s) => s.trim()).filter(Boolean),
      downstream: [
        ...r.archTraces.split(',').map((s) => s.trim()).filter(Boolean),
        ...r.testTraces.split(',').map((s) => s.trim()).filter(Boolean),
      ],
    });

    // Edges from upstream
    for (const up of r.productTraces.split(',')) {
      const u = up.trim();
      if (u && u !== 'NINGUNO') {
        edges.push({
          id: `edge-${u}-${r.id}`,
          source: u,
          target: r.id,
          label: 'derives-from',
          relation: 'derives-from',
          status,
        });
        if (!nodeMap.has(u)) {
          nodeMap.set(u, {
            id: u,
            label: u,
            title: u,
            type: u.startsWith('ACT-') ? 'actor' : u.startsWith('UC-') ? 'usecase' : u.startsWith('BR-') ? 'rule' : 'product',
            layer: 'product',
            status: 'CONFORME',
          });
        }
      }
    }

    // Edges to architecture
    for (const arch of r.archTraces.split(',')) {
      const a = arch.trim();
      if (a && a !== 'NINGUNO') {
        edges.push({
          id: `edge-${r.id}-${a}`,
          source: r.id,
          target: a,
          label: 'satisfies',
          relation: 'satisfies',
          status,
        });
        if (!nodeMap.has(a)) {
          nodeMap.set(a, {
            id: a,
            label: a,
            title: a,
            type: a.startsWith('CMP-') ? 'component' : a.startsWith('ADR-') ? 'adr' : 'architecture',
            layer: 'architecture',
            status: 'CONFORME',
          });
        }
      }
    }

    // Edges to tests
    for (const tst of r.testTraces.split(',')) {
      const t = tst.trim();
      if (t && t !== 'NINGUNO') {
        const testId = t.replace(/[^a-zA-Z0-9_-]/g, '_');
        edges.push({
          id: `edge-${r.id}-${testId}`,
          source: r.id,
          target: testId,
          label: 'verified-by',
          relation: 'verified-by',
          status,
        });
        if (!nodeMap.has(testId)) {
          nodeMap.set(testId, {
            id: testId,
            label: path.basename(t),
            title: t,
            type: t.endsWith('.feature') ? 'bdd-feature' : 'code-test',
            layer: 'test',
            status: 'CONFORME',
            filePath: t,
          });
        }
      }
    }
  }

  // Update status for nodes with cryptographic drifts
  for (const [id, node] of nodeMap.entries()) {
    if (driftTargets.has(id)) {
      node.status = 'DRIFT';
    }
  }

  const nodesByLayer: Record<GraphNodeLayer, number> = {
    product: 0,
    requirement: 0,
    architecture: 0,
    test: 0,
  };

  let conformingCount = 0;
  let issueCount = 0;

  const elements: CytoscapeElement[] = [];

  for (const n of nodeMap.values()) {
    nodesByLayer[n.layer] = (nodesByLayer[n.layer] || 0) + 1;
    if (n.status === 'CONFORME') {
      conformingCount++;
    } else {
      issueCount++;
    }
    elements.push({
      group: 'nodes',
      data: n,
      classes: `layer-${n.layer} status-${n.status.toLowerCase()}`,
    });
  }

  for (const e of edges) {
    elements.push({
      group: 'edges',
      data: e,
      classes: `relation-${e.relation} status-${e.status?.toLowerCase() || 'conforme'}`,
    });
  }

  return { elements, nodesByLayer, conformingCount, issueCount };
}

/**
 * Loads historical KPI records from reports/releases/ directory.
 */
export function collectHistoricalKpis(rootDir: string): DashboardHistoricalKpi[] {
  const releasesDir = path.join(rootDir, 'reports', 'releases');
  const items: DashboardHistoricalKpi[] = [];

  if (fs.existsSync(releasesDir)) {
    try {
      const files = fs.readdirSync(releasesDir).filter((f) => f.endsWith('.kpis.json'));
      for (const file of files) {
        const fullPath = path.join(releasesDir, file);
        const content = fs.readFileSync(fullPath, 'utf-8');
        const report = JSON.parse(content) as ReleaseKpiReport;
        items.push({
          id: report.releaseBranch,
          label: report.releaseBranch,
          timestamp: report.generatedAt,
          kloc: report.totalKloc,
          commits: report.totalCommits,
          bugs: report.totalBugs,
          defectDensity: report.globalDefectDensity,
          reworkPercent: report.reworkTimePercent,
          costUsd: report.totalCostUsd,
        });
      }
    } catch {
      // Ignore unparseable historical records
    }
  }

  // Sort by timestamp
  return items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Collects complete project metrics for dashboard tabs.
 */
export function collectDashboardMetrics(rootDir: string) {
  const gate = verifyQualityGate({ rootDir });
  const gov = verifyTasksGovernance({ rootDir });
  const cov = verifyTestingCoverage({ rootDir });
  const trace = verifyTraceability({ rootDir });
  const history = collectHistoricalKpis(rootDir);

  let activePrKpi = null;
  let activeBranch = 'HEAD';
  try {
    try {
      activeBranch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
        cwd: rootDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
    } catch {
      activeBranch = 'HEAD';
    }

    const isDefaultBranch = activeBranch === 'main' || activeBranch === 'master';
    if (isDefaultBranch) {
      let base = 'HEAD~20';
      try {
        const count = parseInt(
          execFileSync('git', ['rev-list', '--count', 'HEAD'], {
            cwd: rootDir,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
          }).trim(),
          10
        );
        if (count <= 20) {
          const rootCommit = execFileSync('git', ['rev-list', '--max-parents=0', 'HEAD'], {
            cwd: rootDir,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
          }).trim().split('\n')[0];
          base = rootCommit;
        }
      } catch {
        base = 'HEAD~1';
      }
      activePrKpi = aggregatePrKpis(base, 'HEAD', { cwd: rootDir });
    } else {
      activePrKpi = aggregatePrKpis('main', 'HEAD', { cwd: rootDir });
      if (activePrKpi.totalCommits === 0) {
        try {
          activePrKpi = aggregatePrKpis('HEAD~1', 'HEAD', { cwd: rootDir });
        } catch {
          // Keep 0 commits if unable
        }
      }
    }
  } catch {
    // Graceful fallback if git range is unavailable
  }

  return {
    gate,
    gov,
    cov,
    trace,
    history,
    activePrKpi,
    activeBranch,
  };
}

/**
 * Renders the HTML string for the interactive dashboard.
 */
export function renderDashboardHtml(
  graphData: GraphElementsResult,
  metricsData: ReturnType<typeof collectDashboardMetrics>,
  title: string = 'AI-SDLC: Dashboard Interactivo de Trazabilidad y Calidad'
): string {
  const cytoscapeScript = getCytoscapeScript();
  const elementsJson = JSON.stringify(graphData.elements);
  const now = new Date().toISOString();

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    :root {
      --bg-dark: #0f172a;
      --panel-bg: #1e293b;
      --card-bg: #334155;
      --accent-cyan: #38bdf8;
      --accent-emerald: #10b981;
      --accent-amber: #f59e0b;
      --accent-rose: #ef4444;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --border-color: #475569;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: var(--bg-dark); color: var(--text-main); height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
    
    header { background: var(--panel-bg); border-bottom: 1px solid var(--border-color); padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand h1 { font-size: 1.15rem; font-weight: 700; color: var(--accent-cyan); letter-spacing: -0.025em; }
    .badge { padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
    .badge-green { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid #10b981; }
    .badge-amber { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid #f59e0b; }

    nav.tabs { display: flex; background: var(--panel-bg); border-bottom: 1px solid var(--border-color); padding: 0 24px; gap: 8px; }
    .tab-btn { background: transparent; border: none; color: var(--text-muted); padding: 10px 16px; font-weight: 600; font-size: 0.875rem; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; }
    .tab-btn:hover { color: var(--text-main); }
    .tab-btn.active { color: var(--accent-cyan); border-bottom-color: var(--accent-cyan); }

    main { flex: 1; position: relative; overflow: hidden; display: flex; }
    .tab-panel { display: none; width: 100%; height: 100%; overflow: auto; }
    .tab-panel.active { display: flex; }

    /* Cytoscape View */
    #graph-view { position: relative; flex: 1; height: 100%; display: flex; }
    #cy { flex: 1; height: 100%; background: #0b1120; }
    .graph-toolbar { position: absolute; top: 16px; left: 16px; z-index: 10; display: flex; flex-direction: column; gap: 8px; background: rgba(30, 41, 59, 0.85); backdrop-filter: blur(8px); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); box-shadow: 0 8px 16px rgba(0,0,0,0.4); max-width: 300px; }
    .tool-row { display: flex; gap: 6px; align-items: center; }
    .tool-btn { background: var(--card-bg); border: 1px solid var(--border-color); color: var(--text-main); padding: 6px 10px; border-radius: 4px; font-size: 0.75rem; cursor: pointer; font-weight: 600; transition: background 0.2s; }
    .tool-btn:hover { background: #475569; }
    .tool-select, .tool-input { background: var(--card-bg); border: 1px solid var(--border-color); color: var(--text-main); padding: 6px 8px; border-radius: 4px; font-size: 0.75rem; width: 100%; }
    
    .sidebar { width: 340px; background: var(--panel-bg); border-left: 1px solid var(--border-color); padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
    .sidebar h2 { font-size: 1rem; color: var(--accent-cyan); border-bottom: 1px solid var(--border-color); padding-bottom: 8px; }
    .sidebar-field { font-size: 0.8rem; line-height: 1.4; }
    .sidebar-field strong { color: var(--text-muted); display: block; font-size: 0.7rem; text-transform: uppercase; margin-bottom: 2px; }
    .sidebar-field pre { background: var(--card-bg); padding: 8px; border-radius: 4px; overflow-x: auto; font-size: 0.75rem; color: #a5f3fc; }

    /* Tables & Cards View */
    .content-container { padding: 24px; width: 100%; max-width: 1300px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
    .grid-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
    .metric-card { background: var(--panel-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 18px; display: flex; flex-direction: column; gap: 6px; }
    .metric-card .title { font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 600; }
    .metric-card .value { font-size: 1.8rem; font-weight: 800; color: var(--text-main); }
    .metric-card .subtitle { font-size: 0.75rem; color: var(--accent-cyan); }

    .data-table { width: 100%; border-collapse: collapse; background: var(--panel-bg); border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color); font-size: 0.85rem; }
    .data-table th, .data-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border-color); }
    .data-table th { background: #182234; color: var(--text-muted); font-weight: 700; text-transform: uppercase; font-size: 0.75rem; }
    .data-table tr:hover { background: rgba(255,255,255,0.03); }

    /* Timeline & KPI Historical */
    .chart-container { background: var(--panel-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 20px; }
    .chart-container h3 { font-size: 0.9rem; color: var(--accent-cyan); margin-bottom: 16px; }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <h1>AI-SDLC // DASHBOARD INTERACTIVO</h1>
      <span class="badge ${graphData.issueCount === 0 ? 'badge-green' : 'badge-amber'}">
        ${graphData.issueCount === 0 ? '100% CONFORME' : graphData.issueCount + ' INCIDENCIAS'}
      </span>
    </div>
    <div style="font-size: 0.75rem; color: var(--text-muted);">
      Generado: <span>${now.replace('T', ' ').substring(0, 19)}</span>
    </div>
  </header>

  <nav class="tabs">
    <button class="tab-btn active" onclick="switchTab('graph')">🌐 Grafo PDaC / RTM</button>
    <button class="tab-btn" onclick="switchTab('rtm')">📋 Matriz RTM 360°</button>
    <button class="tab-btn" onclick="switchTab('quality')">📊 Calidad & Gobernanza</button>
    <button class="tab-btn" onclick="switchTab('kpis')">📈 Telemetría & Histórico KPIs</button>
  </nav>

  <main>
    <!-- TAB 1: CYTOSCAPE GRAPH -->
    <div id="tab-graph" class="tab-panel active" style="flex: 1;">
      <div id="graph-view">
        <div class="graph-toolbar">
          <div class="tool-row">
            <button class="tool-btn" onclick="cyZoom(0.2)">Zoom +</button>
            <button class="tool-btn" onclick="cyZoom(-0.2)">Zoom -</button>
            <button class="tool-btn" onclick="cy.fit(30)">Centrar</button>
            <button class="tool-btn" onclick="resetHighlight()">Limpiar</button>
          </div>
          <div class="tool-row">
            <select id="layout-select" class="tool-select" onchange="applyLayout(this.value)">
              <option value="breadthfirst">Jerárquico (Capas)</option>
              <option value="cose">Fuerza dirigida (COSE)</option>
              <option value="concentric">Concéntrico</option>
              <option value="circle">Circular</option>
            </select>
          </div>
          <div class="tool-row">
            <select id="layer-filter" class="tool-select" onchange="filterLayer(this.value)">
              <option value="all">Todas las Capas</option>
              <option value="product">Capa 1: Producto (Upstream)</option>
              <option value="requirement">Capa 2: Requerimientos</option>
              <option value="architecture">Capa 3: Arquitectura (Midstream)</option>
              <option value="test">Capa 4: Pruebas (Downstream)</option>
            </select>
          </div>
          <div class="tool-row">
            <select id="status-filter" class="tool-select" onchange="filterStatus(this.value)">
              <option value="all">Todos los Estados</option>
              <option value="CONFORME">Solo Conformes (Verde)</option>
              <option value="issues">Solo Huérfanos / Deriva (Rojo)</option>
            </select>
          </div>
          <div class="tool-row">
            <input type="text" id="node-search" class="tool-input" placeholder="Buscar ID de nodo..." oninput="searchNode(this.value)">
          </div>
        </div>
        <div id="cy"></div>
      </div>
      <aside class="sidebar" id="node-details">
        <h2>Detalle del Nodo</h2>
        <div id="sidebar-content" style="display: flex; flex-direction: column; gap: 12px;">
          <p style="color: var(--text-muted); font-size: 0.8rem;">Haz clic en cualquier nodo del grafo para inspeccionar su camino crítico y trazabilidad completa.</p>
        </div>
      </aside>
    </div>

    <!-- TAB 2: RTM TABLE -->
    <div id="tab-rtm" class="tab-panel">
      <div class="content-container">
        <h2>Matriz de Trazabilidad de Requerimientos 360°</h2>
        <table class="data-table">
          <thead>
            <tr>
              <th>ID Requerimiento</th>
              <th>Título</th>
              <th>Producto (Upstream)</th>
              <th>Arquitectura (Midstream)</th>
              <th>Pruebas (Downstream)</th>
              <th>Estado Global</th>
            </tr>
          </thead>
          <tbody>
            ${metricsData.trace.rows.map((r: any) => `
              <tr onclick="focusNode('${r.id}')" style="cursor: pointer;">
                <td><strong><code>${r.id}</code></strong></td>
                <td>${r.title}</td>
                <td><code>${r.productTraces}</code></td>
                <td><code>${r.archTraces}</code></td>
                <td><code>${r.testTraces}</code></td>
                <td><span class="badge ${r.productStatus === 'CONFORME' && r.archStatus === 'CONFORME' && r.testStatus === 'CONFORME' ? 'badge-green' : 'badge-amber'}">${r.productStatus === 'CONFORME' && r.archStatus === 'CONFORME' && r.testStatus === 'CONFORME' ? 'CONFORME' : 'HUÉRFANO'}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 3: QUALITY & GOVERNANCE -->
    <div id="tab-quality" class="tab-panel">
      <div class="content-container">
        <div class="grid-cards">
          <div class="metric-card">
            <span class="title">Release Gate</span>
            <span class="value" style="color: ${metricsData.gate.success ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">${metricsData.gate.success ? 'PASS' : 'FAIL'}</span>
            <span class="subtitle">${metricsData.gate.failCount} funciones violando política</span>
          </div>
          <div class="metric-card">
            <span class="title">Mantenibilidad (SEI MI)</span>
            <span class="value">${metricsData.gate.results.length > 0 ? Math.round(metricsData.gate.results.reduce((a: number, b: any) => a + b.maintainability, 0) / metricsData.gate.results.length) : 100} / 100</span>
            <span class="subtitle">Umbral mínimo: ${metricsData.gate.policy.min_maintainability}</span>
          </div>
          <div class="metric-card">
            <span class="title">Complejidad Ciclomática</span>
            <span class="value">${metricsData.gate.results.length > 0 ? (metricsData.gate.results.reduce((a: number, b: any) => a + b.cyclomatic, 0) / metricsData.gate.results.length).toFixed(1) : 1.0}</span>
            <span class="subtitle">Umbral máximo: ${metricsData.gate.policy.max_cyclomatic}</span>
          </div>
          <div class="metric-card">
            <span class="title">Cobertura BDD Requisitos</span>
            <span class="value">${metricsData.cov.totalRequirements > 0 ? Math.round((metricsData.cov.passedRequirements / metricsData.cov.totalRequirements) * 100) : 100}%</span>
            <span class="subtitle">${metricsData.cov.passedRequirements} / ${metricsData.cov.totalRequirements} verificados</span>
          </div>
        </div>

        <div class="chart-container">
          <h3>Distribución de Modos de Autonomía de Tareas (Gobernanza)</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Modo de Autonomía</th>
                <th>Semáforo</th>
                <th>Cantidad</th>
                <th>Rol Agente / Intervención Requerida</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>AUTONOMOUS</code></td>
                <td>🟢</td>
                <td><strong>${metricsData.gov.modeCounts?.AUTONOMOUS || 0}</strong></td>
                <td>Planificación y codificación autónoma. Revisión en PR.</td>
              </tr>
              <tr>
                <td><code>HUMAN_REVIEW_PLAN</code></td>
                <td>🟡</td>
                <td><strong>${metricsData.gov.modeCounts?.HUMAN_REVIEW_PLAN || 0}</strong></td>
                <td>Plan detallado aprobado antes de codificar.</td>
              </tr>
              <tr>
                <td><code>AMBIGUOUS</code></td>
                <td>🟠</td>
                <td><strong>${metricsData.gov.modeCounts?.AMBIGUOUS || 0}</strong></td>
                <td>Detenido: Refinamiento requerido con Product Owner.</td>
              </tr>
              <tr>
                <td><code>HIGH_RISK_MANUAL</code></td>
                <td>🔴</td>
                <td><strong>${metricsData.gov.modeCounts?.HIGH_RISK_MANUAL || 0}</strong></td>
                <td>Ejecución directa por ingenieros humanos.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 4: TELEMETRY & HISTORICAL KPIS -->
    <div id="tab-kpis" class="tab-panel">
      <div class="content-container">
        <h2>Telemetría Activa e Histórico de KPIs</h2>
        ${metricsData.activePrKpi ? `
        <div class="grid-cards">
          <div class="metric-card">
            <span class="title">Commits en Rama Activa</span>
            <span class="value">${metricsData.activePrKpi.totalCommits}</span>
            <span class="subtitle">+${metricsData.activePrKpi.linesAdded} / -${metricsData.activePrKpi.linesDeleted} líneas</span>
          </div>
          <div class="metric-card">
            <span class="title">Tiempo de Desarrollo Activo</span>
            <span class="value">${Math.round(metricsData.activePrKpi.totalActiveTimeSeconds / 60)}m</span>
            <span class="subtitle">${metricsData.activePrKpi.totalActiveTimeSeconds}s acumulados</span>
          </div>
          <div class="metric-card">
            <span class="title">Tokens Consumidos</span>
            <span class="value">${metricsData.activePrKpi.totalTokens.toLocaleString('en-US')}</span>
            <span class="subtitle">In: ${metricsData.activePrKpi.totalPromptTokens.toLocaleString()} | Out: ${metricsData.activePrKpi.totalCompletionTokens.toLocaleString()}</span>
          </div>
          <div class="metric-card">
            <span class="title">Coste Estimado Computación</span>
            <span class="value">$${metricsData.activePrKpi.estimatedCostUsd.toFixed(2)}</span>
            <span class="subtitle">USD ponderado</span>
          </div>
        </div>

        <div class="chart-container">
          <h3>Desglose de Telemetría por Autor y Modelo (${metricsData.activeBranch || 'HEAD'})</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Entidad / Modelo</th>
                <th>Tipo</th>
                <th>Commits</th>
                <th>Líneas (+/-)</th>
                <th>Tiempo Activo</th>
                <th>Tokens Consumidos</th>
                <th>Coste Estimado ($ USD)</th>
              </tr>
            </thead>
            <tbody>
              ${metricsData.activePrKpi.humanSummary.commits > 0 ? `
              <tr>
                <td><strong>Humano (Desarrollador)</strong></td>
                <td><span class="badge" style="background:#334155;">HUMAN</span></td>
                <td>${metricsData.activePrKpi.humanSummary.commits}</td>
                <td>+${metricsData.activePrKpi.humanSummary.linesAdded} / -${metricsData.activePrKpi.humanSummary.linesDeleted}</td>
                <td>${Math.round(metricsData.activePrKpi.humanSummary.activeTimeSeconds / 60)}m</td>
                <td>0</td>
                <td>—</td>
              </tr>
              ` : ''}
              ${Object.entries(metricsData.activePrKpi.byModel).map(([model, summary]: [string, any]) => `
              <tr>
                <td><strong><code>${model}</code></strong></td>
                <td><span class="badge badge-green">AGENT</span></td>
                <td>${summary.commits}</td>
                <td>+${summary.linesAdded} / -${summary.linesDeleted}</td>
                <td>${Math.round(summary.activeTimeSeconds / 60)}m</td>
                <td>${(summary.promptTokens + summary.completionTokens).toLocaleString('en-US')}</td>
                <td>$${summary.estimatedCostUsd.toFixed(2)}</td>
              </tr>
              `).join('')}
              <tr style="font-weight: bold; background: rgba(255,255,255,0.05);">
                <td>TOTAL RAMA</td>
                <td>—</td>
                <td>${metricsData.activePrKpi.totalCommits}</td>
                <td>+${metricsData.activePrKpi.linesAdded} / -${metricsData.activePrKpi.linesDeleted}</td>
                <td>${Math.round(metricsData.activePrKpi.totalActiveTimeSeconds / 60)}m</td>
                <td>${metricsData.activePrKpi.totalTokens.toLocaleString('en-US')}</td>
                <td>$${metricsData.activePrKpi.estimatedCostUsd.toFixed(2)} USD</td>
              </tr>
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="chart-container">
          <h3>Histórico Consolidado de Releases</h3>
          ${metricsData.history.length > 0 ? `
          <table class="data-table">
            <thead>
              <tr>
                <th>Release</th>
                <th>Fecha</th>
                <th>KLoC</th>
                <th>Commits</th>
                <th>Bugs Confirmados</th>
                <th>DIR (Bugs/KLoC)</th>
                <th>Rework (%)</th>
                <th>Coste ($ USD)</th>
              </tr>
            </thead>
            <tbody>
              ${metricsData.history.map((h: any) => `
                <tr>
                  <td><strong><code>${h.id}</code></strong></td>
                  <td>${h.timestamp.substring(0, 10)}</td>
                  <td>${h.kloc}</td>
                  <td>${h.commits}</td>
                  <td>${h.bugs}</td>
                  <td><strong>${h.defectDensity}</strong></td>
                  <td>${h.reworkPercent}%</td>
                  <td>$${h.costUsd.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : `
          <p style="color: var(--text-muted); font-size: 0.85rem;">
            No se registran aún informes de release consolidados en <code>reports/releases/*.kpis.json</code>.
            Utiliza el comando <code>aisdlc kpi release --release &lt;rama&gt;</code> para consolidar métricas de entrega.
          </p>
          `}
        </div>
      </div>
    </div>
  </main>

  <script>
    ${cytoscapeScript}
  </script>
  <script>
    var elements = ${elementsJson};
    var cy = null;

    function initCytoscape() {
      if (typeof cytoscape === 'undefined') {
        console.error('Cytoscape library not loaded');
        return;
      }
      cy = cytoscape({
        container: document.getElementById('cy'),
        elements: elements,
        style: [
          {
            selector: 'node',
            style: {
              'label': 'data(label)',
              'color': '#f8fafc',
              'font-size': '10px',
              'text-valign': 'center',
              'text-halign': 'center',
              'width': 65,
              'height': 35,
              'background-color': '#1e293b',
              'border-width': 2,
              'border-color': '#64748b',
              'text-wrap': 'ellipsis',
              'text-max-width': '60px'
            }
          },
          {
            selector: 'node.layer-product',
            style: { 'shape': 'diamond', 'background-color': '#0e7490', 'border-color': '#38bdf8', 'width': 50, 'height': 50 }
          },
          {
            selector: 'node.layer-requirement',
            style: { 'shape': 'round-rectangle', 'border-width': 3 }
          },
          {
            selector: 'node.layer-architecture',
            style: { 'shape': 'hexagon', 'background-color': '#4338ca', 'border-color': '#818cf8', 'width': 60, 'height': 45 }
          },
          {
            selector: 'node.layer-test',
            style: { 'shape': 'ellipse', 'background-color': '#047857', 'border-color': '#34d399', 'width': 50, 'height': 50 }
          },
          {
            selector: 'node.status-conforme',
            style: { 'border-color': '#10b981' }
          },
          {
            selector: 'node.status-huérfano, node.status-drift',
            style: { 'border-color': '#ef4444', 'background-color': '#7f1d1d' }
          },
          {
            selector: 'edge',
            style: {
              'width': 1.5,
              'line-color': '#475569',
              'target-arrow-color': '#475569',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'arrow-scale': 0.8
            }
          },
          {
            selector: 'node.highlighted',
            style: {
              'border-width': 4,
              'border-color': '#38bdf8',
              'shadow-blur': 15,
              'shadow-color': '#38bdf8',
              'shadow-opacity': 0.8
            }
          },
          {
            selector: 'edge.highlighted',
            style: {
              'line-color': '#38bdf8',
              'target-arrow-color': '#38bdf8',
              'width': 3,
              'z-index': 99
            }
          },
          {
            selector: 'node.dimmed, edge.dimmed',
            style: {
              'opacity': 0.15
            }
          }
        ],
        layout: {
          name: 'breadthfirst',
          directed: true,
          padding: 30,
          spacingFactor: 1.25
        }
      });

      cy.on('tap', 'node', function(evt) {
        var node = evt.target;
        highlightCriticalPath(node);
        showNodeDetails(node.data());
      });

      cy.on('tap', function(evt) {
        if (evt.target === cy) {
          resetHighlight();
        }
      });
    }

    function highlightCriticalPath(node) {
      cy.elements().removeClass('highlighted dimmed');
      var predecessors = node.predecessors();
      var successors = node.successors();
      var criticalPath = node.union(predecessors).union(successors);
      
      criticalPath.addClass('highlighted');
      cy.elements().difference(criticalPath).addClass('dimmed');
    }

    function resetHighlight() {
      if (!cy) return;
      cy.elements().removeClass('highlighted dimmed');
      var sidebar = document.getElementById('sidebar-content');
      sidebar.innerHTML = '<p style="color: var(--text-muted); font-size: 0.8rem;">Haz clic en cualquier nodo del grafo para inspeccionar su camino crítico y trazabilidad completa.</p>';
    }

    function showNodeDetails(data) {
      var sidebar = document.getElementById('sidebar-content');
      var html = '<div class="sidebar-field"><strong>ID / Identificador:</strong> <code>' + data.id + '</code></div>';
      html += '<div class="sidebar-field"><strong>Título:</strong> ' + (data.title || data.label) + '</div>';
      html += '<div class="sidebar-field"><strong>Capa / Tipo:</strong> <span class="badge" style="background:#334155;">' + data.layer.toUpperCase() + ' (' + data.type + ')</span></div>';
      html += '<div class="sidebar-field"><strong>Estado:</strong> <span class="badge ' + (data.status === 'CONFORME' ? 'badge-green' : 'badge-amber') + '">' + data.status + '</span></div>';
      if (data.filePath) {
        html += '<div class="sidebar-field"><strong>Archivo Físico:</strong> <code>' + data.filePath + '</code></div>';
      }
      if (data.upstream && data.upstream.length > 0) {
        html += '<div class="sidebar-field"><strong>Trazas Upstream (Producto):</strong> ' + data.upstream.join(', ') + '</div>';
      }
      if (data.downstream && data.downstream.length > 0) {
        html += '<div class="sidebar-field"><strong>Trazas Downstream (Arch/Test):</strong> ' + data.downstream.join(', ') + '</div>';
      }
      sidebar.innerHTML = html;
    }

    function applyLayout(name) {
      if (!cy) return;
      cy.layout({ name: name, directed: true, padding: 30, animate: true, animationDuration: 400 }).run();
    }

    function filterLayer(layer) {
      if (!cy) return;
      if (layer === 'all') {
        cy.elements().show();
      } else {
        cy.elements().hide();
        var nodes = cy.nodes('.layer-' + layer);
        nodes.show();
        nodes.connectedEdges().show();
      }
      cy.fit(30);
    }

    function filterStatus(status) {
      if (!cy) return;
      if (status === 'all') {
        cy.elements().show();
      } else if (status === 'CONFORME') {
        cy.elements().hide();
        var nodes = cy.nodes('.status-conforme');
        nodes.show();
        nodes.connectedEdges().show();
      } else {
        cy.elements().hide();
        var nodes = cy.nodes('.status-huérfano, .status-drift');
        nodes.show();
        nodes.connectedEdges().show();
      }
      cy.fit(30);
    }

    function searchNode(text) {
      if (!cy) return;
      if (!text || text.trim() === '') {
        resetHighlight();
        return;
      }
      var q = text.trim().toLowerCase();
      var matched = cy.nodes().filter(function(ele) {
        return ele.data('id').toLowerCase().includes(q) || (ele.data('title') && ele.data('title').toLowerCase().includes(q));
      });
      if (matched.length > 0) {
        highlightCriticalPath(matched[0]);
        showNodeDetails(matched[0].data());
        cy.center(matched[0]);
      }
    }

    function focusNode(id) {
      switchTab('graph');
      setTimeout(function() {
        if (!cy) return;
        var node = cy.getElementById(id);
        if (node && node.length > 0) {
          highlightCriticalPath(node);
          showNodeDetails(node.data());
          cy.center(node);
          cy.zoom(1.2);
        }
      }, 100);
    }

    function cyZoom(val) {
      if (!cy) return;
      cy.zoom(cy.zoom() + val);
    }

    function switchTab(name) {
      document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
      document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
      event.target?.classList?.add('active');
      var p = document.getElementById('tab-' + name);
      if (p) p.classList.add('active');
      if (name === 'graph' && cy) {
        cy.resize();
        cy.fit(30);
      }
    }

    window.addEventListener('DOMContentLoaded', function() {
      initCytoscape();
    });
  </script>
</body>
</html>`;
}

/**
 * Main function to generate the dashboard report.
 */
export function generateDashboardReport(options: DashboardOptions = {}): DashboardResult {
  const rootDir = options.rootDir || process.cwd();
  const outputPath = options.outputPath || path.join(rootDir, 'reports', 'dashboard.html');

  const graphData = buildGraphElements(rootDir);
  const metricsData = collectDashboardMetrics(rootDir);
  const html = renderDashboardHtml(graphData, metricsData, options.title);

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, html, 'utf-8');

  const totalReqs = metricsData.cov.totalRequirements || 1;
  const passedReqs = metricsData.cov.passedRequirements || 0;
  const bddCoverageRatio = Math.round((passedReqs / totalReqs) * 100);

  const traceReqs = metricsData.trace.totalRequirements || 1;
  const conformingTrace = metricsData.trace.totalRequirements - metricsData.trace.orphanCount;
  const traceabilityRatio = Math.round((conformingTrace / traceReqs) * 100);

  const gateResults = metricsData.gate.results;
  const avgMi = gateResults.length > 0 ? Math.round(gateResults.reduce((a, b) => a + b.maintainability, 0) / gateResults.length) : 100;
  const avgCc = gateResults.length > 0 ? Math.round((gateResults.reduce((a, b) => a + b.cyclomatic, 0) / gateResults.length) * 10) / 10 : 1;

  return {
    outputPath,
    totalNodes: graphData.elements.filter((e) => e.group === 'nodes').length,
    totalEdges: graphData.elements.filter((e) => e.group === 'edges').length,
    conformingCount: graphData.conformingCount,
    issueCount: graphData.issueCount,
    nodesByLayer: graphData.nodesByLayer,
    metrics: {
      totalFiles: metricsData.gate.totalFiles,
      totalFunctions: metricsData.gate.totalFunctions,
      avgMaintainability: avgMi,
      avgCyclomatic: avgCc,
      qualityVerdict: metricsData.gate.success ? 'PASS' : 'FAIL',
      autonomyDistribution: metricsData.gov.modeCounts || {},
      traceabilityRatio,
      bddCoverageRatio,
    },
    html,
  };
}
