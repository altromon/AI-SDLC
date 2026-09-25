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
import { walkMdFiles } from '../utils/fs.js';
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
    const isOk =
      (r.productStatus === 'COMPLIANT' || r.productStatus === 'CONFORME') &&
      (r.archStatus === 'COMPLIANT' || r.archStatus === 'CONFORME') &&
      (r.testStatus === 'COMPLIANT' || r.testStatus === 'CONFORME');
    const status: GraphNodeStatus = isOk ? 'COMPLIANT' : 'ORPHAN';
    nodeMap.set(r.id, {
      id: r.id,
      label: r.id,
      title: r.title,
      type: r.type || 'requirement',
      layer: 'requirement',
      status,
      content: r.content,
      filePath: r.filePath,
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
      if (u && u !== 'NINGUNO' && u !== 'NONE') {
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
            status: 'COMPLIANT',
          });
        }
      }
    }

    // Edges to architecture
    for (const arch of r.archTraces.split(',')) {
      const a = arch.trim();
      if (a && a !== 'NINGUNO' && a !== 'NONE') {
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
            status: 'COMPLIANT',
          });
        }
      }
    }

    // Edges to tests
    for (const tst of r.testTraces.split(',')) {
      const t = tst.trim();
      if (t && t !== 'NINGUNO' && t !== 'NONE') {
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
          let testContent = undefined;
          const fullTestPath = path.isAbsolute(t) ? t : path.join(rootDir, t);
          if (fs.existsSync(fullTestPath)) {
            try {
              testContent = fs.readFileSync(fullTestPath, 'utf-8');
            } catch {}
          }
          nodeMap.set(testId, {
            id: testId,
            label: path.basename(t),
            title: t,
            type: t.endsWith('.feature') ? 'bdd-feature' : 'code-test',
            layer: 'test',
            status: 'COMPLIANT',
            filePath: t,
            content: testContent ? '```' + (t.endsWith('.feature') ? 'gherkin' : 'typescript') + '\n' + testContent.substring(0, 1500) + (testContent.length > 1500 ? '\n... (truncated)' : '') + '\n```' : undefined,
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

  // Populate bidirectional upstream and downstream traces for all nodes
  for (const e of edges) {
    const srcNode = nodeMap.get(e.source);
    const tgtNode = nodeMap.get(e.target);
    if (srcNode) {
      srcNode.downstream = srcNode.downstream || [];
      if (!srcNode.downstream.includes(e.target)) {
        srcNode.downstream.push(e.target);
      }
    }
    if (tgtNode) {
      tgtNode.upstream = tgtNode.upstream || [];
      if (!tgtNode.upstream.includes(e.source)) {
        tgtNode.upstream.push(e.source);
      }
    }
  }

  // Enrich all nodes with filePath, title, content, and type by scanning workspace artifact directories
  const artifactDirs = ['product', 'architecture', 'specs', 'security'];
  for (const dirName of artifactDirs) {
    const fullDirPath = path.join(rootDir, dirName);
    if (fs.existsSync(fullDirPath)) {
      const files = walkMdFiles(fullDirPath);
      for (const f of files) {
        try {
          const fileContent = fs.readFileSync(f, 'utf-8');
          const relPath = path.relative(rootDir, f).replace(/\\/g, '/');
          const baseName = path.basename(f, '.md');
          const match = fileContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
          let idVal = undefined;
          let titleVal = undefined;
          let typeVal = undefined;
          if (match) {
            const idM = match[1].match(/^id:\s*["']?([^"'\r\n]+)["']?/m);
            if (idM) idVal = idM[1].trim();
            const tM = match[1].match(/^title:\s*["']?([^"'\r\n]+)["']?/m);
            if (tM) titleVal = tM[1].trim();
            const typM = match[1].match(/^type:\s*["']?([^"'\r\n]+)["']?/m);
            if (typM) typeVal = typM[1].trim();
          }

          const candidateIds = [idVal, baseName, path.basename(f)].filter((id): id is string => Boolean(id));
          for (const cid of candidateIds) {
            const n = nodeMap.get(cid);
            if (n) {
              if (!n.filePath) n.filePath = relPath;
              if ((!n.title || n.title === n.id) && titleVal) n.title = titleVal;
              if (!n.content) n.content = fileContent.replace(/^---\r?\n[\s\S]*?\r?\n---/, '').trim();
              if (typeVal && (!n.type || n.type === 'product' || n.type === 'architecture')) {
                n.type = typeVal;
              }
            }
          }
        } catch {
          // Ignore unparseable
        }
      }
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
    if (n.status === 'COMPLIANT' || n.status === 'CONFORME') {
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
      classes: `relation-${e.relation} status-${e.status?.toLowerCase() || 'compliant'}`,
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
    /* REQUIREMENT HOVER TOOLTIP */
    .req-tooltip {
      position: fixed;
      z-index: 10000;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid var(--accent-cyan);
      border-radius: 6px;
      padding: 8px 12px;
      max-width: 280px;
      font-size: 0.75rem;
      line-height: 1.35;
      color: var(--text-main);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
      pointer-events: none;
      animation: tooltipFadeIn 0.12s ease-out;
    }

    @keyframes tooltipFadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .tooltip-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 3px;
    }

    .tooltip-id {
      font-weight: 700;
      color: var(--accent-cyan);
      font-size: 0.75rem;
      font-family: ui-monospace, SFMono-Regular, monospace;
    }

    .tooltip-title {
      font-size: 0.7rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tooltip-body {
      font-size: 0.7rem;
      color: #cbd5e1;
      max-height: 80px;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <h1>AI-SDLC // INTERACTIVE DASHBOARD</h1>
      <span class="badge ${graphData.issueCount === 0 ? 'badge-green' : 'badge-amber'}">
        ${graphData.issueCount === 0 ? '100% COMPLIANT' : graphData.issueCount + ' ISSUES'}
      </span>
    </div>
    <div style="font-size: 0.75rem; color: var(--text-muted);">
      Generated: <span>${now.replace('T', ' ').substring(0, 19)}</span>
    </div>
  </header>

  <nav class="tabs">
    <button class="tab-btn active" onclick="switchTab('graph')">🌐 PDaC / RTM Graph</button>
    <button class="tab-btn" onclick="switchTab('rtm')">📋 360° RTM Matrix</button>
    <button class="tab-btn" onclick="switchTab('quality')">📊 Quality & Governance</button>
    <button class="tab-btn" onclick="switchTab('kpis')">📈 Telemetry & Historical KPIs</button>
  </nav>

  <main>
    <!-- TAB 1: CYTOSCAPE GRAPH -->
    <div id="tab-graph" class="tab-panel active" style="flex: 1;">
      <div id="graph-view">
        <div class="graph-toolbar">
          <div class="tool-row">
            <button class="tool-btn" onclick="cyZoom(0.2)">Zoom +</button>
            <button class="tool-btn" onclick="cyZoom(-0.2)">Zoom -</button>
            <button class="tool-btn" onclick="cy.fit(30)">Center</button>
            <button class="tool-btn" onclick="resetHighlight()">Reset</button>
          </div>
          <div class="tool-row">
            <select id="layout-select" class="tool-select" onchange="applyLayout(this.value)">
              <option value="breadthfirst">Hierarchical (Layers)</option>
              <option value="cose">Force-directed (COSE)</option>
              <option value="concentric">Concentric</option>
              <option value="circle">Circular</option>
            </select>
          </div>
          <div class="tool-row">
            <select id="layer-filter" class="tool-select" onchange="filterLayer(this.value)">
              <option value="all">All Layers</option>
              <option value="product">Layer 1: Product (Upstream)</option>
              <option value="requirement">Layer 2: Requirements</option>
              <option value="architecture">Layer 3: Architecture (Midstream)</option>
              <option value="test">Layer 4: Testing (Downstream)</option>
            </select>
          </div>
          <div class="tool-row">
            <select id="status-filter" class="tool-select" onchange="filterStatus(this.value)">
              <option value="all">All Statuses</option>
              <option value="COMPLIANT">Only Compliant (Green)</option>
              <option value="issues">Only Orphans / Drift (Red)</option>
            </select>
          </div>
          <div class="tool-row">
            <input type="text" id="node-search" class="tool-input" placeholder="Search node ID..." oninput="searchNode(this.value)">
          </div>
        </div>
        <div id="cy"></div>
      </div>
      <aside class="sidebar" id="node-details">
        <h2>Node Details</h2>
        <div id="sidebar-content" style="display: flex; flex-direction: column; gap: 12px;">
          <p style="color: var(--text-muted); font-size: 0.8rem;">Click on any graph node to inspect its critical path and full traceability.</p>
        </div>
      </aside>
    </div>

    <!-- TAB 2: RTM TABLE -->
    <div id="tab-rtm" class="tab-panel">
      <div class="content-container">
        <h2>360° Requirements Traceability Matrix</h2>
        <table class="data-table">
          <thead>
            <tr>
              <th>Requirement ID</th>
              <th>Title</th>
              <th>Product (Upstream)</th>
              <th>Architecture (Midstream)</th>
              <th>Testing (Downstream)</th>
              <th>Global Status</th>
            </tr>
          </thead>
          <tbody>
            ${metricsData.trace.rows.map((r: any) => {
              const isRowOk = (r.productStatus === 'COMPLIANT' || r.productStatus === 'CONFORME') &&
                (r.archStatus === 'COMPLIANT' || r.archStatus === 'CONFORME') &&
                (r.testStatus === 'COMPLIANT' || r.testStatus === 'CONFORME');
              return `
              <tr onclick="focusNode('${r.id}')" onmouseenter="startRowTooltip(event, '${r.id}')" onmouseleave="cancelRowTooltip()" onmousemove="updateRowTooltipPos(event)" style="cursor: pointer;">
                <td><strong><code>${r.id}</code></strong></td>
                <td>${r.title}</td>
                <td><code>${r.productTraces}</code></td>
                <td><code>${r.archTraces}</code></td>
                <td><code>${r.testTraces}</code></td>
                <td><span class="badge ${isRowOk ? 'badge-green' : 'badge-amber'}">${isRowOk ? 'COMPLIANT' : 'ORPHAN'}</span></td>
              </tr>
            `}).join('')}
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
            <span class="subtitle">${metricsData.gate.failCount} policy-violating functions</span>
          </div>
          <div class="metric-card">
            <span class="title">Maintainability (SEI MI)</span>
            <span class="value">${metricsData.gate.results.length > 0 ? Math.round(metricsData.gate.results.reduce((a: number, b: any) => a + b.maintainability, 0) / metricsData.gate.results.length) : 100} / 100</span>
            <span class="subtitle">Minimum threshold: ${metricsData.gate.policy.min_maintainability}</span>
          </div>
          <div class="metric-card">
            <span class="title">Cyclomatic Complexity</span>
            <span class="value">${metricsData.gate.results.length > 0 ? (metricsData.gate.results.reduce((a: number, b: any) => a + b.cyclomatic, 0) / metricsData.gate.results.length).toFixed(1) : 1.0}</span>
            <span class="subtitle">Maximum threshold: ${metricsData.gate.policy.max_cyclomatic}</span>
          </div>
          <div class="metric-card">
            <span class="title">Requirements BDD Coverage</span>
            <span class="value">${metricsData.cov.totalRequirements > 0 ? Math.round((metricsData.cov.passedRequirements / metricsData.cov.totalRequirements) * 100) : 100}%</span>
            <span class="subtitle">${metricsData.cov.passedRequirements} / ${metricsData.cov.totalRequirements} verified</span>
          </div>
        </div>

        <div class="chart-container">
          <h3>Task Autonomy Modes Distribution (Governance)</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Autonomy Mode</th>
                <th>Status</th>
                <th>Count</th>
                <th>Agent Role / Required Intervention</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>AUTONOMOUS</code></td>
                <td>🟢</td>
                <td><strong>${metricsData.gov.modeCounts?.AUTONOMOUS || 0}</strong></td>
                <td>Autonomous planning and coding. Asynchronous PR review.</td>
              </tr>
              <tr>
                <td><code>HUMAN_REVIEW_PLAN</code></td>
                <td>🟡</td>
                <td><strong>${metricsData.gov.modeCounts?.HUMAN_REVIEW_PLAN || 0}</strong></td>
                <td>Detailed plan approved before coding.</td>
              </tr>
              <tr>
                <td><code>AMBIGUOUS</code></td>
                <td>🟠</td>
                <td><strong>${metricsData.gov.modeCounts?.AMBIGUOUS || 0}</strong></td>
                <td>Halted: Refinement required with Product Owner.</td>
              </tr>
              <tr>
                <td><code>HIGH_RISK_MANUAL</code></td>
                <td>🔴</td>
                <td><strong>${metricsData.gov.modeCounts?.HIGH_RISK_MANUAL || 0}</strong></td>
                <td>Direct execution by human engineers.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 4: TELEMETRY & HISTORICAL KPIS -->
    <div id="tab-kpis" class="tab-panel">
      <div class="content-container">
        <h2>Active Telemetry and KPI History</h2>
        ${metricsData.activePrKpi ? `
        <div class="grid-cards">
          <div class="metric-card">
            <span class="title">Commits in Active Branch</span>
            <span class="value">${metricsData.activePrKpi.totalCommits}</span>
            <span class="subtitle">+${metricsData.activePrKpi.linesAdded} / -${metricsData.activePrKpi.linesDeleted} lines</span>
          </div>
          <div class="metric-card">
            <span class="title">Active Development Time</span>
            <span class="value">${Math.round(metricsData.activePrKpi.totalActiveTimeSeconds / 60)}m</span>
            <span class="subtitle">${metricsData.activePrKpi.totalActiveTimeSeconds}s accumulated</span>
          </div>
          <div class="metric-card">
            <span class="title">Consumed Tokens</span>
            <span class="value">${metricsData.activePrKpi.totalTokens.toLocaleString('en-US')}</span>
            <span class="subtitle">In: ${metricsData.activePrKpi.totalPromptTokens.toLocaleString()} | Out: ${metricsData.activePrKpi.totalCompletionTokens.toLocaleString()}</span>
          </div>
          <div class="metric-card">
            <span class="title">Estimated Compute Cost</span>
            <span class="value">$${metricsData.activePrKpi.estimatedCostUsd.toFixed(2)}</span>
            <span class="subtitle">Weighted USD</span>
          </div>
        </div>

        <div class="chart-container">
          <h3>Telemetry Breakdown by Author and Model (${metricsData.activeBranch || 'HEAD'})</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Entity / Model</th>
                <th>Type</th>
                <th>Commits</th>
                <th>Lines (+/-)</th>
                <th>Active Time</th>
                <th>Consumed Tokens</th>
                <th>Estimated Cost ($ USD)</th>
              </tr>
            </thead>
            <tbody>
              ${metricsData.activePrKpi.humanSummary.commits > 0 ? `
              <tr>
                <td><strong>Human (Developer)</strong></td>
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
                <td>TOTAL BRANCH</td>
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
          <h3>Consolidated Release History</h3>
          ${metricsData.history.length > 0 ? `
          <table class="data-table">
            <thead>
              <tr>
                <th>Release</th>
                <th>Date</th>
                <th>KLoC</th>
                <th>Commits</th>
                <th>Confirmed Bugs</th>
                <th>DIR (Bugs/KLoC)</th>
                <th>Rework (%)</th>
                <th>Cost ($ USD)</th>
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
            No consolidated release reports recorded yet in <code>reports/releases/*.kpis.json</code>.
            Use the command <code>aisdlc kpi release --release &lt;branch&gt;</code> to consolidate delivery metrics.
          </p>
          `}
        </div>
      </div>
    </div>
  </main>

    <!-- REQUIREMENT HOVER TOOLTIP (1s hover) -->
    <div id="req-tooltip" class="req-tooltip" style="display: none;">
      <div class="tooltip-header">
        <span class="tooltip-id" id="tooltip-id">FR-000</span>
        <span class="tooltip-title" id="tooltip-title">Title</span>
      </div>
      <div class="tooltip-body" id="tooltip-body"></div>
    </div>

  <script>
    ${cytoscapeScript}
  </script>
  <script>
    var elements = ${elementsJson};
    var cy = null;

    var reqHoverTimer = null;
    var currentHoverNodeId = null;
    var tableHoverTimer = null;
    var tableHoverId = null;
    var lastMouseX = 0;
    var lastMouseY = 0;

    function renderMarkdown(md) {
      if (!md || !md.trim()) {
        return '<p style="color: var(--text-muted); font-style: italic;">Sin contenido detallado en el cuerpo del requisito.</p>';
      }
      try {
        var text = md
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

        // Code blocks (triple backticks)
        var tick = String.fromCharCode(96);
        var codeBlockRe = new RegExp(tick + '{3}([a-z]*)[\\\\r\\\\n]+([\\\\s\\\\S]*?)' + tick + '{3}', 'g');
        text = text.replace(codeBlockRe, function(_, lang, code) {
          return '<pre><code>' + code.trim() + '</code></pre>';
        });

        // Inline code (single backtick)
        var inlineCodeRe = new RegExp(tick + '([^' + tick + ']+)' + tick, 'g');
        text = text.replace(inlineCodeRe, '<code>$1</code>');

        // Headers (h3, h2, h1)
        text = text.replace(/^### (.*$)/gim, '<h4>$1</h4>');
        text = text.replace(/^## (.*$)/gim, '<h3>$1</h3>');
        text = text.replace(/^# (.*$)/gim, '<h2>$1</h2>');

        // Bold & italic
        text = text.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
        text = text.replace(/\\*([^*]+)\\*/g, '<em>$1</em>');

        // Unordered lists
        text = text.replace(/^\\s*[-*]\\s+(.*$)/gim, '<li>$1</li>');
        text = text.replace(/(<li>[\\s\\S]*?<\\/li>(?:\\r?\\n)*)+/g, function(match) {
          return '<ul>' + match + '</ul>';
        });

        // Paragraph line breaks
        text = text.replace(/\\r?\\n\\r?\\n/g, '<br/><br/>');

        return text;
      } catch (err) {
        return '<div style="white-space: pre-wrap; font-family: monospace;">' +
          md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') +
          '</div>';
      }
    }

    function showTooltip(data, x, y) {
      var tooltip = document.getElementById('req-tooltip');
      if (!tooltip) return;
      document.getElementById('tooltip-id').textContent = data.id;
      document.getElementById('tooltip-title').textContent = data.title || data.label || '';
      var bodyEl = document.getElementById('tooltip-body');
      var desc = data.content ? data.content.trim() : (data.title || data.id) + ' [' + (data.layer || data.type || 'NODE').toUpperCase() + ']';
      bodyEl.textContent = desc;

      tooltip.style.display = 'block';
      positionTooltip(tooltip, x, y);
    }

    function positionTooltip(tooltip, x, y) {
      var pad = 15;
      var left = x + pad;
      var top = y + pad;
      var rect = tooltip.getBoundingClientRect();
      if (left + rect.width > window.innerWidth - 10) {
        left = Math.max(10, x - rect.width - pad);
      }
      if (top + rect.height > window.innerHeight - 10) {
        top = Math.max(10, y - rect.height - pad);
      }
      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
    }

    function updateTooltipPosition(x, y) {
      var tooltip = document.getElementById('req-tooltip');
      if (tooltip && tooltip.style.display !== 'none') {
        positionTooltip(tooltip, x, y);
      }
    }

    function hideTooltip() {
      var tooltip = document.getElementById('req-tooltip');
      if (tooltip) {
        tooltip.style.display = 'none';
      }
    }

    function startRowTooltip(event, id) {
      tableHoverId = id;
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
      clearTimeout(tableHoverTimer);
      tableHoverTimer = setTimeout(function() {
        if (tableHoverId === id) {
          var nodeData = null;
          if (cy) {
            var n = cy.getElementById(id);
            if (n && n.length > 0) nodeData = n.data();
          }
          if (!nodeData) {
            var el = elements.find(function(e) { return e.data && e.data.id === id; });
            if (el) nodeData = el.data;
          }
          if (nodeData) {
            showTooltip(nodeData, lastMouseX, lastMouseY);
          }
        }
      }, 1000);
    }

    function updateRowTooltipPos(event) {
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
      updateTooltipPosition(lastMouseX, lastMouseY);
    }

    function cancelRowTooltip() {
      clearTimeout(tableHoverTimer);
      tableHoverId = null;
      hideTooltip();
    }

    function initCytoscape() {
      if (typeof cytoscape === 'undefined') {
        console.error('Cytoscape library not loaded');
        return;
      }
      cy = cytoscape({
        container: document.getElementById('cy'),
        elements: elements,
        boxSelectionEnabled: false,
        autoungrabify: true,
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
        var data = node.data();
        highlightCriticalPath(node);
        showNodeDetails(data);
      });

      cy.on('tap', function(evt) {
        if (evt.target === cy) {
          resetHighlight();
        }
      });

      cy.on('mouseover', 'node', function(evt) {
        var node = evt.target;
        var data = node.data();

        currentHoverNodeId = data.id;
        clearTimeout(reqHoverTimer);

        var rect = document.getElementById('cy').getBoundingClientRect();
        var clientX = (evt.originalEvent && evt.originalEvent.clientX) || (rect.left + evt.renderedPosition.x);
        var clientY = (evt.originalEvent && evt.originalEvent.clientY) || (rect.top + evt.renderedPosition.y);

        reqHoverTimer = setTimeout(function() {
          if (currentHoverNodeId === data.id) {
            showTooltip(data, clientX, clientY);
          }
        }, 1000);
      });

      cy.on('mousemove', 'node', function(evt) {
        if (evt.originalEvent) {
          updateTooltipPosition(evt.originalEvent.clientX, evt.originalEvent.clientY);
        }
      });

      cy.on('mouseout', 'node', function(evt) {
        clearTimeout(reqHoverTimer);
        currentHoverNodeId = null;
        hideTooltip();
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
      sidebar.innerHTML = '<p style="color: var(--text-muted); font-size: 0.8rem;">Click on any graph node to inspect its critical path and full traceability.</p>';
    }

    function showNodeDetails(data) {
      try {
        var sidebar = document.getElementById('sidebar-content');
        if (!sidebar) return;
        var isConform = data.status === 'COMPLIANT' || data.status === 'CONFORME';
        var layerName = (data.layer || data.type || 'NODE').toUpperCase();
        var html = '<div class="sidebar-field"><strong>ID / Identifier:</strong> <code>' + data.id + '</code></div>';
        html += '<div class="sidebar-field"><strong>Title:</strong> ' + (data.title || data.label || data.id) + '</div>';
        html += '<div class="sidebar-field"><strong>Layer / Type:</strong> <span class="badge" style="background:#334155;">' + layerName + ' (' + (data.type || data.layer || 'node') + ')</span></div>';
        html += '<div class="sidebar-field"><strong>Status:</strong> <span class="badge ' + (isConform ? 'badge-green' : 'badge-amber') + '">' + (data.status || 'UNKNOWN') + '</span></div>';
        if (data.filePath) {
          var cleanMetaPath = data.filePath.split('\\\\').join('/');
          if (cleanMetaPath.indexOf('./') === 0) cleanMetaPath = cleanMetaPath.substring(2);
          var metaHref = (cleanMetaPath.indexOf('http://') === 0 || cleanMetaPath.indexOf('https://') === 0 || cleanMetaPath.indexOf('file://') === 0) ? cleanMetaPath : '../' + cleanMetaPath;
          html += '<div class="sidebar-field"><strong>Physical File:</strong> <a href="' + metaHref + '" target="_blank" rel="noopener noreferrer" style="color: #7dd3fc; text-decoration: underline;" title="Abrir archivo: ' + cleanMetaPath + '"><code>' + cleanMetaPath + ' ↗</code></a></div>';
        }
        if (data.upstream && data.upstream.length > 0) {
          html += '<div class="sidebar-field"><strong>Upstream Traces (Product):</strong> ' + data.upstream.join(', ') + '</div>';
        }
        if (data.downstream && data.downstream.length > 0) {
          html += '<div class="sidebar-field"><strong>Downstream Traces (Arch/Test):</strong> ' + data.downstream.join(', ') + '</div>';
        }
        if (data.content && data.content.trim()) {
          html += '<div class="sidebar-field" style="margin-top: 4px;"><strong>Contenido / Especificación del Fichero:</strong>';
          html += '<div class="sidebar-content-preview" style="margin-top: 6px; max-height: 280px; overflow-y: auto; background: rgba(11, 17, 32, 0.75); padding: 10px 12px; border-radius: 6px; border: 1px solid var(--border-color); font-size: 0.74rem; line-height: 1.45; color: #cbd5e1;">';
          html += renderMarkdown(data.content);
          html += '</div></div>';
        }
        sidebar.innerHTML = html;
      } catch (err) {
        console.error('Error showing node details:', err);
      }
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
      } else if (status === 'COMPLIANT' || status === 'CONFORME') {
        cy.elements().hide();
        var nodes = cy.nodes('.status-compliant, .status-conforme');
        nodes.show();
        nodes.connectedEdges().show();
      } else {
        cy.elements().hide();
        var nodes = cy.nodes('.status-orphan, .status-huérfano, .status-drift');
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
      cancelRowTooltip();
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
      hideTooltip();
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

    window.addEventListener('keydown', function(evt) {
      if (evt.key === 'Escape' || evt.key === 'Esc') {
        hideTooltip();
      }
    });

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
