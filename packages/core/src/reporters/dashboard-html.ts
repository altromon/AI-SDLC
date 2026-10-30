import { resolveDeterministicDate } from '../utils/time.js';
/**
 * AI-SDLC: Dashboard HTML Renderer
 * Generates modular offline HTML for Cytoscape Graph, RTM 360°, Quality Gates, and KPIs.
 */

import {
  CodeCoverageSummary,
  DashboardHistoricalKpi,
  GovernanceResult,
  ManualDocumentItem,
  ManualsCoverageSummary,
  ManualsVerificationResult,
  QualityGateResult,
  TaskSummary,
  TestingCoverageResult,
  TraceabilityResult,
  TraceabilityRow,
} from '../types/index.js';
import { AuthorKpiSummary, PrKpiAggregation } from './pr-kpis.js';
import { GraphElementsResult } from './dashboard-graph.js';
import { getCytoscapeScript } from './cytoscape-bundle.js';
import { DASHBOARD_CSS, DASHBOARD_CLIENT_SCRIPT } from './dashboard-template.js';

export interface DashboardMetricsData {
  gate: QualityGateResult;
  gov: GovernanceResult;
  cov: TestingCoverageResult;
  codeCoverage: CodeCoverageSummary | null;
  trace: TraceabilityResult;
  manuals: ManualsVerificationResult;
  history: DashboardHistoricalKpi[];
  activePrKpi: PrKpiAggregation | null;
  activeBranch: string;
  branchTelemetries?: Record<string, PrKpiAggregation>;
  totalTelemetry?: PrKpiAggregation | null;
}

const GRAPH_LEGEND_HTML = `
        <div class="graph-legend">
          <div class="legend-header">Node Typologies</div>
          <div class="legend-items">
            <div class="legend-item" data-type="architecture-introduction" onclick="handleTypologyClick(event, 'architecture-introduction')" title="Filter Vision / Goals"><span class="legend-dot" style="background:#0f766e; border:2px solid #2dd4bf;"></span><strong>Vision / Goals</strong> (ARCH-INTRO)</div>
            <div class="legend-item" data-type="journey" onclick="handleTypologyClick(event, 'journey')" title="Filter Journey"><span class="legend-dot" style="background:#581c87; border:2px solid #c084fc;"></span><strong>Journey</strong> (JRN)</div>
            <div class="legend-item" data-type="actor" onclick="handleTypologyClick(event, 'actor')" title="Filter Actor"><span class="legend-dot" style="background:#065f46; border:2px solid #34d399; border-radius:50%;"></span><strong>Actor</strong> (ACT)</div>
            <div class="legend-item" data-type="use-case" onclick="handleTypologyClick(event, 'use-case')" title="Filter Use Case"><span class="legend-dot" style="background:#0369a1; border:2px solid #38bdf8;"></span><strong>Use Case</strong> (UC)</div>
            <div class="legend-item" data-type="business-rule" onclick="handleTypologyClick(event, 'business-rule')" title="Filter Business Rule"><span class="legend-dot" style="background:#b45309; border:2px solid #fbbf24; transform:rotate(45deg);"></span><strong>Business Rule</strong> (BR)</div>
            <div class="legend-item" data-type="bounded-context" onclick="handleTypologyClick(event, 'bounded-context')" title="Filter Bounded Context"><span class="legend-dot" style="background:#4338ca; border:2px solid #a5b4fc;"></span><strong>Bounded Context</strong> (BC)</div>
            <div class="legend-item" data-type="abuse-case" onclick="handleTypologyClick(event, 'abuse-case')" title="Filter Abuse Case"><span class="legend-dot" style="background:#881337; border:2px solid #f43f5e;"></span><strong>Abuse Case</strong> (ABUSE)</div>
            <div class="legend-item" data-type="data-asset" onclick="handleTypologyClick(event, 'data-asset')" title="Filter Data Asset"><span class="legend-dot" style="background:#134e4a; border:2px solid #5eead4;"></span><strong>Data Asset</strong> (DATA-ASSET)</div>
            <div class="legend-item" data-type="privacy-ropa" onclick="handleTypologyClick(event, 'privacy-ropa')" title="Filter Privacy ROPA"><span class="legend-dot" style="background:#1e3a8a; border:2px solid #60a5fa;"></span><strong>Privacy ROPA</strong> (PRIV-ROPA)</div>
            <div class="legend-item" data-type="requirement" onclick="handleTypologyClick(event, 'requirement')" title="Filter Requirement"><span class="legend-dot" style="background:#1e293b; border:2px solid #64748b;"></span><strong>Requirement</strong> (FR/QR/SEC/PRIV)</div>
            <div class="legend-item" data-type="architecture" onclick="handleTypologyClick(event, 'architecture')" title="Filter Architecture"><span class="legend-dot" style="background:#312e81; border:2px solid #818cf8;"></span><strong>Architecture</strong> (CMP/ADR)</div>
            <div class="legend-item" data-type="test" onclick="handleTypologyClick(event, 'test')" title="Filter Test"><span class="legend-dot" style="background:#047857; border:2px solid #10b981;"></span><strong>Test</strong> (BDD/Test)</div>
          </div>
        </div>
`;

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function safeJsonForScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function renderHeaderHtml(issueCount: number, now: string): string {
  const badgeClass = issueCount === 0 ? 'badge-green' : 'badge-amber';
  const badgeText = issueCount === 0 ? '100% COMPLIANT' : `${issueCount} ISSUES`;
  return [
    `  <header>`,
    `    <div class="brand">`,
    `      <h1>AI-SDLC // INTERACTIVE DASHBOARD</h1>`,
    `      <span class="badge ${badgeClass}">${badgeText}</span>`,
    `    </div>`,
    `    <div style="font-size: 0.75rem; color: var(--text-muted);">Generated: <span>${now.replace('T', ' ').substring(0, 19)}</span></div>`,
    `  </header>`,
  ].join('\n');
}

function renderNavTabsHtml(): string {
  return [
    `  <nav class="tabs">`,
    `    <button class="tab-btn active" onclick="switchTab('graph')">🌐 PDaC / RTM Graph</button>`,
    `    <button class="tab-btn" onclick="switchTab('rtm')">📋 360° RTM Matrix</button>`,
    `    <button class="tab-btn" onclick="switchTab('quality')">📊 Quality &amp; Governance</button>`,
    `    <button class="tab-btn" onclick="switchTab('manuals')">📖 Manuals (User &amp; Prod)</button>`,
    `    <button class="tab-btn" onclick="switchTab('kpis')">📈 Telemetry &amp; Historical KPIs</button>`,
    `  </nav>`,
  ].join('\n');
}

function renderGraphToolbarHtml(): string {
  return [
    `        <div class="graph-toolbar">`,
    `          <div class="tool-row"><button class="tool-btn" onclick="cyZoom(0.2)">Zoom +</button><button class="tool-btn" onclick="cyZoom(-0.2)">Zoom -</button><button class="tool-btn" onclick="cy.fit(30)">Center</button><button class="tool-btn" onclick="resetHighlight()">Reset</button></div>`,
    `          <div class="tool-row"><select id="layout-select" class="tool-select" onchange="applyLayout(this.value)"><option value="breadthfirst">Hierarchical (Layers)</option><option value="cose">Force-directed (COSE)</option><option value="concentric">Concentric</option><option value="circle">Circular</option></select></div>`,
    `          <div class="tool-row"><select id="type-filter" class="tool-select" onchange="filterType(this.value)"><option value="all">All Typologies</option><option value="architecture-introduction">Vision &amp; Goals (ARCH-INTRO)</option><option value="journey">Journeys (JRN)</option><option value="actor">Actors (ACT)</option><option value="use-case">Use Cases (UC)</option><option value="business-rule">Business Rules (BR)</option><option value="bounded-context">Bounded Contexts (BC)</option><option value="abuse-case">Abuse Cases (ABUSE)</option><option value="data-asset">Data Assets (DATA-ASSET)</option><option value="privacy-ropa">Privacy ROPA (PRIV-ROPA)</option><option value="requirement">Requirements (FR/QR/SEC/PRIV)</option><option value="architecture">Architecture (CMP/ADR)</option><option value="test">Testing (BDD/Test)</option></select></div>`,
    `          <div class="tool-row"><select id="layer-filter" class="tool-select" onchange="filterLayer(this.value)"><option value="all">All Layers</option><option value="product">Layer 1: Product (Upstream)</option><option value="requirement">Layer 2: Requirements</option><option value="architecture">Layer 3: Architecture (Midstream)</option><option value="test">Layer 4: Testing (Downstream)</option></select></div>`,
    `          <div class="tool-row"><select id="status-filter" class="tool-select" onchange="filterStatus(this.value)"><option value="all">All Statuses</option><option value="COMPLIANT">Only Compliant (Green)</option><option value="issues">Only Orphans / Drift (Red)</option></select></div>`,
    `          <div class="tool-row"><input type="text" id="node-search" class="tool-input" placeholder="Search node ID..." oninput="searchNode(this.value)"></div>`,
    `        </div>`,
  ].join('\n');
}

function renderGraphTabHtml(): string {
  const toolbar = renderGraphToolbarHtml();
  return [
    `    <div id="tab-graph" class="tab-panel active" style="flex: 1;">`,
    `      <div id="graph-view">`,
    toolbar,
    `        <div id="cy"></div>`,
    GRAPH_LEGEND_HTML,
    `      </div>`,
    `      <aside class="sidebar" id="node-details"><h2>Node Details</h2><div id="sidebar-content" style="display: flex; flex-direction: column; gap: 12px;"><p style="color: var(--text-muted); font-size: 0.8rem;">Click on any graph node to inspect its critical path and full traceability.</p></div></aside>`,
    `    </div>`,
  ].join('\n');
}

function isStatusConforming(status: string): boolean {
  return status === 'COMPLIANT' || status === 'CONFORME';
}

function isTraceRowCompliant(r: TraceabilityRow): boolean {
  return isStatusConforming(r.productStatus) &&
    isStatusConforming(r.archStatus) &&
    isStatusConforming(r.testStatus);
}

function renderRtmRowHtml(r: TraceabilityRow): string {
  const isRowOk = isTraceRowCompliant(r);
  const badgeClass = isRowOk ? 'badge-green' : 'badge-amber';
  const badgeText = isRowOk ? 'COMPLIANT' : 'ORPHAN';
  const safeId = escapeHtml(String(r.id || ''));

  return [
    `<tr onclick="focusNode('${safeId}')" onmouseenter="startRowTooltip(event, '${safeId}')" onmouseleave="cancelRowTooltip()" onmousemove="updateRowTooltipPos(event)" style="cursor: pointer;">`,
    `  <td><strong><code>${safeId}</code></strong></td>`,
    `  <td>${escapeHtml(String(r.title || ''))}</td>`,
    `  <td><code>${escapeHtml(String(r.productTraces || ''))}</code></td>`,
    `  <td><code>${escapeHtml(String(r.archTraces || ''))}</code></td>`,
    `  <td><code>${escapeHtml(String(r.testTraces || ''))}</code></td>`,
    `  <td><span class="badge ${badgeClass}">${badgeText}</span></td>`,
    `</tr>`,
  ].join('');
}

function renderRtmTabHtml(rows: TraceabilityRow[]): string {
  const rowsHtml = rows.map(renderRtmRowHtml).join('\n');
  return [
    `    <div id="tab-rtm" class="tab-panel">`,
    `      <div class="content-container">`,
    `        <h2>360° Requirements Traceability Matrix</h2>`,
    `        <table class="data-table">`,
    `          <thead><tr><th>Requirement ID</th><th>Title</th><th>Product (Upstream)</th><th>Architecture (Midstream)</th><th>Testing (Downstream)</th><th>Global Status</th></tr></thead>`,
    `          <tbody>`,
    rowsHtml,
    `          </tbody>`,
    `        </table>`,
    `      </div>`,
    `    </div>`,
  ].join('\n');
}

function resolveTaskBadge(rawStatus: string): { badgeClass: string; badgeText: string } {
  if (rawStatus === 'COMPLETED') return { badgeClass: 'badge-green', badgeText: 'COMPLETED (Cerrada)' };
  if (rawStatus === 'IN_PROGRESS') return { badgeClass: 'badge-blue', badgeText: 'IN_PROGRESS (Abierta)' };
  if (rawStatus === 'BLOCKED') return { badgeClass: 'badge-rose', badgeText: 'BLOCKED (Abierta)' };
  return { badgeClass: 'badge-amber', badgeText: `${rawStatus} (Abierta)` };
}

function extractTaskSummaryInfo(t: TaskSummary) {
  const task = t.task;
  const rawStatus = (task?.status || 'PENDING').toUpperCase();
  const criteria = task?.verification?.criteria || 'N/A';
  const cleanPath = (t.file || '').replace(/\\/g, '/').replace(/^\.\//, '');
  const pathParts = cleanPath.split('/');
  return {
    taskId: escapeHtml(task?.id || 'TSK-UNKNOWN'),
    taskTitle: escapeHtml(task?.title || 'Untitled task'),
    assignedTo: escapeHtml(task?.assignedTo || 'agent-developer'),
    isOpen: rawStatus !== 'COMPLETED',
    rawStatus,
    criteria,
    criteriaShort: criteria.length > 45 ? `${criteria.substring(0, 42)}...` : criteria,
    shortFile: pathParts.length > 2 ? pathParts.slice(-2).join('/') : cleanPath,
  };
}

function renderModeTaskRow(t: TaskSummary, globalIndex: number): string {
  const info = extractTaskSummaryInfo(t);
  const { badgeClass, badgeText } = resolveTaskBadge(info.rawStatus);

  return [
    `<tr class="task-row task-item task-item-${info.isOpen ? 'open' : 'closed'}" onclick="showTaskSidebar(${globalIndex})" title="Ver información de ${info.taskId}">`,
    `  <td><strong style="color: var(--accent-cyan); font-family: monospace;"><code>${info.taskId}</code></strong></td>`,
    `  <td><span style="color: var(--text-main); font-weight: 500;">${info.taskTitle}</span></td>`,
    `  <td><span class="badge ${badgeClass}">${escapeHtml(badgeText)}</span></td>`,
    `  <td><code>${info.assignedTo}</code></td>`,
    `  <td><code style="font-size: 0.72rem; color: #cbd5e1;" title="${escapeHtml(info.criteria)}">${escapeHtml(info.criteriaShort)}</code></td>`,
    `  <td><code style="color: var(--text-muted); font-size: 0.75rem;">${escapeHtml(info.shortFile)}</code></td>`,
    `</tr>`,
  ].join('');
}

function renderModeTaskTable(mode: string, modeTasks: TaskSummary[], allTasks: TaskSummary[]): string {
  if (modeTasks.length === 0) {
    return `<div style="color: var(--text-muted); font-size: 0.8rem; padding: 10px 0; font-style: italic;">No hay tareas registradas con modo <code>${mode}</code>.</div>`;
  }
  const rows = modeTasks.map((t) => renderModeTaskRow(t, allTasks.indexOf(t))).join('');
  return [
    `<div id="tasks-empty-${mode}" style="display: none; color: var(--text-muted); font-size: 0.8rem; padding: 10px 0; font-style: italic;">No hay tareas en el filtro seleccionado.</div>`,
    `<table class="sub-data-table" id="tasks-table-${mode}">`,
    `  <thead><tr><th style="width: 105px;">ID Tarea</th><th>Título de la Tarea</th><th style="width: 160px;">Estado</th><th style="width: 130px;">Asignada a</th><th>Verificación</th><th style="width: 200px;">Fichero .md</th></tr></thead>`,
    `  <tbody>${rows}</tbody>`,
    `</table>`,
  ].join('');
}

function renderFilterButtonGroup(mode: string, total: number, openCount: number, closedCount: number): string {
  return [
    `<div class="filter-btn-group">`,
    `  <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">Filtrar:</span>`,
    `  <button type="button" class="filter-btn active" id="btn-filter-${mode}-all" onclick="filterAutonomyTasks('${mode}', 'all', event)">Todas (${total})</button>`,
    `  <button type="button" class="filter-btn" id="btn-filter-${mode}-open" onclick="filterAutonomyTasks('${mode}', 'open', event)">Abiertas (${openCount})</button>`,
    `  <button type="button" class="filter-btn" id="btn-filter-${mode}-closed" onclick="filterAutonomyTasks('${mode}', 'closed', event)">Cerradas (${closedCount})</button>`,
    `</div>`,
  ].join('');
}

function renderModeHeaderHtml(mode: string, statusIcon: string, count: number, roleDescription: string): string {
  return [
    `<tr class="mode-row" onclick="toggleAutonomyTasks('${mode}')" title="Haz clic para desplegar u ocultar las tareas ${mode}">`,
    `  <td><span class="accordion-indicator" id="toggle-icon-${mode}">▶</span><code>${mode}</code><span style="font-size: 0.72rem; color: var(--accent-cyan); margin-left: 6px;">(Ver tareas ▼)</span></td>`,
    `  <td>${statusIcon}</td><td><strong>${count}</strong></td><td>${roleDescription}</td>`,
    `</tr>`,
  ].join('');
}

function renderModePanelHtml(mode: string, count: number, filterBtns: string, tableContent: string): string {
  return [
    `<tr id="tasks-row-${mode}" class="autonomy-tasks-panel" style="display: none;">`,
    `  <td colspan="4"><div class="autonomy-tasks-container"><div class="autonomy-tasks-header"><div class="autonomy-tasks-title"><span>📋 Tareas <code>${mode}</code></span><span class="badge" style="background:#334155;">Total: ${count}</span></div>${filterBtns}</div>${tableContent}</div></td>`,
    `</tr>`,
  ].join('');
}

export function renderAutonomyModeSection(
  mode: string,
  statusIcon: string,
  count: number,
  roleDescription: string,
  allTasks: TaskSummary[] = []
): string {
  const modeTasks = (allTasks || []).filter((t) => (t.task?.autonomyMode || '').toUpperCase() === mode);
  const openCount = modeTasks.filter((t) => (t.task?.status || '').toUpperCase() !== 'COMPLETED').length;
  const closedCount = modeTasks.filter((t) => (t.task?.status || '').toUpperCase() === 'COMPLETED').length;
  const tableContent = renderModeTaskTable(mode, modeTasks, allTasks);
  const filterBtns = renderFilterButtonGroup(mode, modeTasks.length, openCount, closedCount);
  return renderModeHeaderHtml(mode, statusIcon, count, roleDescription) + renderModePanelHtml(mode, modeTasks.length, filterBtns, tableContent);
}

function buildCard(title: string, value: string, subtitle: string, valueStyle: string = ''): string {
  const styleAttr = valueStyle ? ` style="${valueStyle}"` : '';
  return `<div class="metric-card"><span class="title">${title}</span><span class="value"${styleAttr}>${value}</span><span class="subtitle">${subtitle}</span></div>`;
}

function computeGateCardMetrics(
  gate: QualityGateResult,
  cov: TestingCoverageResult,
  codeCoverage: CodeCoverageSummary | null
) {
  const avgMi = gate.results.length > 0 ? Math.round(gate.results.reduce((acc: number, b) => acc + b.maintainability, 0) / gate.results.length) : 100;
  const avgCc = gate.results.length > 0 ? (gate.results.reduce((acc: number, b) => acc + b.cyclomatic, 0) / gate.results.length).toFixed(1) : '1.0';
  const bddPct = cov.totalRequirements > 0 ? Math.round((cov.passedRequirements / cov.totalRequirements) * 100) : 100;
  const linePct = codeCoverage ? `${codeCoverage.linesPct}%` : 'N/A';
  const branchSubtitle = codeCoverage ? `Branches: ${codeCoverage.branchesPct}% | Funcs: ${codeCoverage.functionsPct}%` : `Min target: ${gate.policy.min_line_coverage}%`;
  return { avgMi, avgCc, bddPct, linePct, branchSubtitle };
}

function renderQualityCardsHtml(
  gate: QualityGateResult,
  cov: TestingCoverageResult,
  codeCoverage: CodeCoverageSummary | null
): string {
  const m = computeGateCardMetrics(gate, cov, codeCoverage);
  const gateVerdict = gate.success ? 'PASS' : 'FAIL';
  const gateColor = gate.success ? 'color: var(--accent-emerald);' : 'color: var(--accent-rose);';

  const cards = [
    buildCard('Release Gate', gateVerdict, `${gate.failCount} policy-violating functions`, gateColor),
    buildCard('Maintainability (SEI MI)', `${m.avgMi} / 100`, `Minimum threshold: ${gate.policy.min_maintainability}`),
    buildCard('Cyclomatic Complexity', m.avgCc, `Maximum threshold: ${gate.policy.max_cyclomatic}`),
    buildCard('Requirements BDD Coverage', `${m.bddPct}%`, `${cov.passedRequirements} / ${cov.totalRequirements} verified`),
    buildCard('Code Coverage (Lines)', m.linePct, m.branchSubtitle),
  ];
  return `<div class="grid-cards">\n${cards.join('\n')}\n</div>`;
}

function renderAutonomyModesTbody(tasks: TaskSummary[], counts: Record<string, number>): string {
  return [
    renderAutonomyModeSection('AUTONOMOUS', '🟢', counts.AUTONOMOUS || 0, 'Autonomous planning and coding. Asynchronous PR review.', tasks),
    renderAutonomyModeSection('HUMAN_REVIEW_PLAN', '🟡', counts.HUMAN_REVIEW_PLAN || 0, 'Detailed plan approved before coding.', tasks),
    renderAutonomyModeSection('AMBIGUOUS', '🟠', counts.AMBIGUOUS || 0, 'Halted: Refinement required with Product Owner.', tasks),
    renderAutonomyModeSection('HIGH_RISK_MANUAL', '🔴', counts.HIGH_RISK_MANUAL || 0, 'Direct execution by human engineers.', tasks),
  ].join('\n');
}

function renderQualityTabHtml(metricsData: DashboardMetricsData): string {
  const cardsHtml = renderQualityCardsHtml(metricsData.gate, metricsData.cov, metricsData.codeCoverage);
  const tbodyHtml = renderAutonomyModesTbody(metricsData.gov.tasks, metricsData.gov.modeCounts || {});
  return [
    `    <div id="tab-quality" class="tab-panel">`,
    `      <div class="content-container">`,
    cardsHtml,
    `        <div class="chart-container">`,
    `          <h3>Task Autonomy Modes Distribution (Governance)</h3>`,
    `          <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 12px;">Haz clic sobre cualquier tipo de autonomía para desplegar sus tareas asociadas, filtrar por estado y abrir el fichero .md correspondiente.</p>`,
    `          <table class="data-table"><thead><tr><th>Autonomy Mode</th><th>Status</th><th>Count</th><th>Agent Role / Required Intervention</th></tr></thead><tbody>`,
    tbodyHtml,
    `          </tbody></table>`,
    `        </div>`,
    `      </div>`,
    `    </div>`,
  ].join('\n');
}

function renderManualFindingsHtml(findings: string[]): string {
  if (findings.length === 0) {
    return '<p style="color: var(--accent-emerald); font-size: 0.85rem;">✔ Todos los Journeys, Use Cases, Componentes y Enclaves activos están cubiertos por los manuales.</p>';
  }
  const items = findings.map((f) => `<li>${escapeHtml(f)}</li>`).join('');
  return `<ul style="font-size: 0.82rem; color: #fbbf24; padding-left: 18px; display: flex; flex-direction: column; gap: 4px;">${items}</ul>`;
}

function renderManualRow(m: ManualDocumentItem): string {
  const badgeClass = m.status === 'active' ? 'badge-green' : 'badge-amber';
  const typeLabel = m.type === 'user-manual' ? '👤 Usuario' : '🛠️ Producción';
  return [
    `<tr onclick="showManual('${escapeHtml(m.id)}')" style="cursor: pointer;">`,
    `  <td><strong><code>${escapeHtml(m.id)}</code></strong></td>`,
    `  <td>${typeLabel}</td>`,
    `  <td>${escapeHtml(m.title)}</td>`,
    `  <td><code>${escapeHtml(m.appliesToVersion)}</code></td>`,
    `  <td><span class="badge ${badgeClass}">${escapeHtml(m.status)}</span></td>`,
    `  <td><code>${escapeHtml(m.filePath)}</code></td>`,
    `</tr>`,
  ].join('');
}

function renderManualCardsHtml(coverage: ManualsCoverageSummary, allCount: number, userCount: number, prodCount: number): string {
  return [
    `<div class="grid-cards">`,
    `  <div class="metric-card"><span class="title">Cobertura Manual de Usuario</span><span class="value">${coverage.userCoveragePct}%</span><span class="subtitle">${coverage.coveredJourneys}/${coverage.totalJourneys} JRN &middot; ${coverage.coveredUseCases}/${coverage.totalUseCases} UC</span></div>`,
    `  <div class="metric-card"><span class="title">Cobertura Manual de Producción</span><span class="value">${coverage.productionCoveragePct}%</span><span class="subtitle">${coverage.coveredComponents}/${coverage.totalComponents} CMP &middot; ${coverage.coveredEnclaves}/${coverage.totalEnclaves} SEC-ENC</span></div>`,
    `  <div class="metric-card"><span class="title">Manuales Registrados</span><span class="value">${allCount}</span><span class="subtitle">${userCount} MAN-USER &middot; ${prodCount} MAN-PROD</span></div>`,
    `</div>`,
  ].join('');
}

function renderManualsDesc(manuals: ManualsVerificationResult): string {
  const badgeClass = manuals.status === 'PASSED' ? 'badge-green' : manuals.status === 'WARNING' ? 'badge-amber' : 'badge-rose';
  return `Modo de cumplimiento: <span class="badge ${badgeClass}">${manuals.status}</span> <code>${manuals.enforcementMode}</code> &middot; rama <code>${escapeHtml(manuals.branch)}</code> &middot; perfil <code>${manuals.profile}</code>.`;
}

export function renderManualsTab(manuals: ManualsVerificationResult): string {
  const findings = [...manuals.violations, ...manuals.warnings];
  const allManuals = [...manuals.userManuals, ...manuals.productionManuals];
  const findingsHtml = renderManualFindingsHtml(findings);
  const rowsHtml = allManuals.length === 0
    ? '<tr><td colspan="6" style="color: var(--text-muted);">No hay manuales MAN-USER-* / MAN-PROD-* en <code>manuals/</code>.</td></tr>'
    : allManuals.map(renderManualRow).join('');
  const cardsHtml = renderManualCardsHtml(manuals.coverage, allManuals.length, manuals.userManuals.length, manuals.productionManuals.length);

  return [
    `<h2>Operational Manuals (User &amp; Production)</h2>`,
    `<p style="font-size: 0.8rem; color: var(--text-muted);">${renderManualsDesc(manuals)}</p>`,
    cardsHtml,
    `<div class="chart-container"><h3>Hallazgos de Cobertura</h3>${findingsHtml}</div>`,
    `<table class="data-table"><thead><tr><th>ID</th><th>Tipo</th><th>Título</th><th>Aplica a</th><th>Estado</th><th>Fichero</th></tr></thead><tbody>${rowsHtml}</tbody></table>`,
    `<div class="chart-container" id="manual-viewer-container" style="display: none;"><h3 id="manual-viewer-title"></h3><div id="manual-viewer" style="font-size: 0.82rem; line-height: 1.5; color: #cbd5e1;"></div></div>`,
  ].join('\n');
}

function renderBranchOption(b: string, activeBranch: string): string {
  const isAct = b === activeBranch ? ' (Rama activa)' : '';
  return `  <option value="${escapeHtml(b)}">${escapeHtml(b)}${isAct}</option>`;
}

function renderTelemetrySelect(options: string): string {
  return [
    `  <div style="display: flex; align-items: center; gap: 0.6rem;">`,
    `    <label for="telemetry-branch-select" style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Filtrar por Rama:</label>`,
    `    <select id="telemetry-branch-select" onchange="filterTelemetryByBranch(this.value)" class="form-select" style="background: var(--panel-bg, #1e293b); color: var(--text-main, #f8fafc); border: 1px solid var(--border-color, #475569); border-radius: 6px; padding: 0.4rem 0.8rem; font-size: 0.85rem; cursor: pointer; outline: none; font-weight: 500;">`,
    options,
    `    </select>`,
    `  </div>`,
  ].join('\n');
}

function renderTelemetryFilterBarHtml(branches: string[], activeBranch: string): string {
  const options = [
    `  <option value="__total__" selected>🌟 Totalizador (Todas las ramas)</option>`,
    ...branches.map((b) => renderBranchOption(b, activeBranch)),
  ].join('\n');
  const selectHtml = renderTelemetrySelect(options);
  const badgeHtml = `  <div id="telemetry-badge-container"><span class="badge" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid #38bdf8; font-size: 0.75rem; padding: 0.25rem 0.6rem; border-radius: 4px;">Vista: Totalizador Global</span></div>`;

  return `<div class="telemetry-filter-bar" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">\n${selectHtml}\n${badgeHtml}\n</div>`;
}

function renderTelemetryCardsHtml(kpi: PrKpiAggregation, displayLabel: string = 'Totalizador'): string {
  return [
    `<div class="grid-cards">`,
    `  <div class="metric-card"><span class="title">Commits (<span id="card-branch-label">${escapeHtml(displayLabel)}</span>)</span><span class="value" id="card-commits">${kpi.totalCommits}</span><span class="subtitle" id="card-lines">+${kpi.linesAdded} / -${kpi.linesDeleted} lines</span></div>`,
    `  <div class="metric-card"><span class="title">Active Development Time</span><span class="value" id="card-time">${Math.round(kpi.totalActiveTimeSeconds / 60)}m</span><span class="subtitle" id="card-time-seconds">${kpi.totalActiveTimeSeconds}s accumulated</span></div>`,
    `  <div class="metric-card"><span class="title">Consumed Tokens</span><span class="value" id="card-tokens">${kpi.totalTokens.toLocaleString('en-US')}</span><span class="subtitle" id="card-tokens-detail">In: ${kpi.totalPromptTokens.toLocaleString()} | Out: ${kpi.totalCompletionTokens.toLocaleString()}</span></div>`,
    `  <div class="metric-card"><span class="title">Estimated Compute Cost</span><span class="value" id="card-cost">$${kpi.estimatedCostUsd.toFixed(2)}</span><span class="subtitle">Weighted USD</span></div>`,
    `</div>`,
  ].join('\n');
}

function renderModelRow(model: string, summary: AuthorKpiSummary): string {
  return [
    `<tr>`,
    `  <td><strong><code>${model}</code></strong></td>`,
    `  <td><span class="badge badge-green">AGENT</span></td>`,
    `  <td>${summary.commits}</td>`,
    `  <td>+${summary.linesAdded} / -${summary.linesDeleted}</td>`,
    `  <td>${Math.round(summary.activeTimeSeconds / 60)}m</td>`,
    `  <td>${(summary.promptTokens + summary.completionTokens).toLocaleString('en-US')}</td>`,
    `  <td>$${summary.estimatedCostUsd.toFixed(2)}</td>`,
    `</tr>`,
  ].join('');
}

function renderHumanTelemetryRow(human: AuthorKpiSummary): string {
  if (human.commits <= 0) return '';
  return [
    `<tr>`,
    `  <td><strong>Human (Developer)</strong></td>`,
    `  <td><span class="badge" style="background:#334155;">HUMAN</span></td>`,
    `  <td>${human.commits}</td>`,
    `  <td>+${human.linesAdded} / -${human.linesDeleted}</td>`,
    `  <td>${Math.round(human.activeTimeSeconds / 60)}m</td>`,
    `  <td>0</td><td>—</td>`,
    `</tr>`,
  ].join('');
}

function renderTotalBranchRow(kpi: PrKpiAggregation, isTotal: boolean = false): string {
  const mins = Math.round(kpi.totalActiveTimeSeconds / 60);
  const tokens = kpi.totalTokens.toLocaleString('en-US');
  const cost = kpi.estimatedCostUsd.toFixed(2);
  const label = isTotal ? 'TOTAL REPOSITORIO' : 'TOTAL RAMA';
  return [
    `<tr style="font-weight: bold; background: rgba(255,255,255,0.05);">`,
    `  <td>${label}</td><td>—</td><td>${kpi.totalCommits}</td><td>+${kpi.linesAdded} / -${kpi.linesDeleted}</td>`,
    `  <td>${mins}m</td><td>${tokens}</td><td>$${cost} USD</td>`,
    `</tr>`,
  ].join('');
}

function renderTelemetryTable(kpi: PrKpiAggregation, displayLabel: string): string {
  const humanRow = renderHumanTelemetryRow(kpi.humanSummary);
  const modelRows = Object.entries(kpi.byModel).map(([m, s]: [string, AuthorKpiSummary]) => renderModelRow(m, s)).join('\n');
  const totalRow = renderTotalBranchRow(kpi, displayLabel === 'Totalizador');
  const titleLabel = displayLabel === 'Totalizador' ? 'Totalizador (Todas las ramas)' : displayLabel;

  return [
    `<div class="chart-container">`,
    `  <h3>Telemetry Breakdown by Author and Model (<span id="table-branch-label">${escapeHtml(titleLabel)}</span>)</h3>`,
    `  <table class="data-table"><thead><tr><th>Entity / Model</th><th>Type</th><th>Commits</th><th>Lines (+/-)</th><th>Active Time</th><th>Consumed Tokens</th><th>Estimated Cost ($ USD)</th></tr></thead><tbody id="telemetry-table-tbody">`,
    humanRow,
    modelRows,
    totalRow,
    `  </tbody></table>`,
    `</div>`,
  ].join('\n');
}

function renderActiveTelemetrySection(
  kpi: PrKpiAggregation,
  displayLabel: string,
  branches: string[],
  activeBranch: string
): string {
  const filterBarHtml = renderTelemetryFilterBarHtml(branches, activeBranch);
  const cardsHtml = renderTelemetryCardsHtml(kpi, displayLabel);
  const tableHtml = renderTelemetryTable(kpi, displayLabel);
  return `${filterBarHtml}\n${cardsHtml}\n${tableHtml}`;
}

function renderReleaseHistoryRow(h: DashboardHistoricalKpi): string {
  return [
    `<tr>`,
    `  <td><strong><code>${h.id}</code></strong></td><td>${h.timestamp.substring(0, 10)}</td><td>${h.kloc}</td><td>${h.commits}</td>`,
    `  <td>${h.bugs}</td><td><strong>${h.defectDensity}</strong></td><td>${h.reworkPercent}%</td><td>$${h.costUsd.toFixed(2)}</td>`,
    `</tr>`,
  ].join('');
}

function renderHistoricalKpisTable(history: DashboardHistoricalKpi[]): string {
  if (history.length === 0) {
    return `<p style="color: var(--text-muted); font-size: 0.85rem;">No consolidated release reports recorded yet in <code>reports/releases/*.kpis.json</code>.</p>`;
  }
  const rows = history.map(renderReleaseHistoryRow).join('\n');
  return `<table class="data-table"><thead><tr><th>Release</th><th>Date</th><th>KLoC</th><th>Commits</th><th>Confirmed Bugs</th><th>DIR (Bugs/KLoC)</th><th>Rework (%)</th><th>Cost ($ USD)</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function resolveBranchFilterKeys(metricsData: DashboardMetricsData): string[] {
  const keys = Object.keys(metricsData.branchTelemetries || {});
  if (metricsData.activeBranch && metricsData.activeBranch !== 'HEAD' && !keys.includes(metricsData.activeBranch)) {
    keys.unshift(metricsData.activeBranch);
  }
  return keys;
}

function renderKpisTabHtml(metricsData: DashboardMetricsData): string {
  const displayKpi = metricsData.totalTelemetry || metricsData.activePrKpi;
  const branchKeys = resolveBranchFilterKeys(metricsData);
  const telemetryHtml = displayKpi
    ? renderActiveTelemetrySection(displayKpi, 'Totalizador', branchKeys, metricsData.activeBranch)
    : '<p style="color: var(--text-muted); font-size: 0.85rem;">No telemetry recorded yet in this workspace.</p>';
  const historyContent = renderHistoricalKpisTable(metricsData.history);

  return [
    `    <div id="tab-kpis" class="tab-panel">`,
    `      <div class="content-container">`,
    `        <h2>Active Telemetry and KPI History</h2>`,
    telemetryHtml,
    `        <div class="chart-container"><h3>Consolidated Release History</h3>${historyContent}</div>`,
    `      </div>`,
    `    </div>`,
  ].join('\n');
}

function renderTaskSidebarHtml(): string {
  return [
    `    <div id="req-tooltip" class="req-tooltip" style="display: none;"><div class="tooltip-header"><span class="tooltip-id" id="tooltip-id">FR-000</span><span class="tooltip-title" id="tooltip-title">Title</span></div><div class="tooltip-body" id="tooltip-body"></div></div>`,
    `    <div id="task-backdrop" class="task-backdrop" style="display: none;" onclick="closeTaskSidebar()"></div>`,
    `    <aside id="task-sidebar" class="task-sidebar" aria-label="Task Details">`,
    `      <div class="task-sidebar-header"><h2><span>📋 Detalles de la Tarea</span></h2><button type="button" class="task-sidebar-close" onclick="closeTaskSidebar()" title="Cerrar panel (Esc)">✕</button></div>`,
    `      <div class="task-sidebar-body" id="task-sidebar-content"><p style="color: var(--text-muted); font-size: 0.85rem;">Haz clic en una tarea para ver sus detalles de gobernanza.</p></div>`,
    `    </aside>`,
  ].join('\n');
}

function buildTelemetryMap(metricsData: DashboardMetricsData): Record<string, PrKpiAggregation> {
  const map: Record<string, PrKpiAggregation> = {};
  const total = metricsData.totalTelemetry || metricsData.activePrKpi;
  if (total) map['__total__'] = total;
  Object.assign(map, metricsData.branchTelemetries || {});
  if (metricsData.activePrKpi && metricsData.activeBranch && !map[metricsData.activeBranch]) {
    map[metricsData.activeBranch] = metricsData.activePrKpi;
  }
  return map;
}

function renderDashboardScripts(graphData: GraphElementsResult, metricsData: DashboardMetricsData): string {
  const elementsJson = safeJsonForScript(graphData.elements);
  const govTasksJson = safeJsonForScript(metricsData.gov.tasks || []);
  const allManuals = [...metricsData.manuals.userManuals, ...metricsData.manuals.productionManuals];
  const manualsJson = safeJsonForScript(allManuals);
  const telemetryJson = safeJsonForScript(buildTelemetryMap(metricsData));

  return [
    `  <script>${getCytoscapeScript()}</script>`,
    `  <script>`,
    `    var elements = ${elementsJson};`,
    `    var govTasks = ${govTasksJson};`,
    `    var manualsData = ${manualsJson};`,
    `    var telemetryData = ${telemetryJson};`,
    DASHBOARD_CLIENT_SCRIPT,
    `  </script>`,
  ].join('\n');
}

function renderDashboardHead(title: string): string {
  return `<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(title)}</title><style>${DASHBOARD_CSS}</style></head>`;
}

function renderDashboardMain(metricsData: DashboardMetricsData): string {
  const graphTab = renderGraphTabHtml();
  const rtmTab = renderRtmTabHtml(metricsData.trace.rows);
  const qualityTab = renderQualityTabHtml(metricsData);
  const manualsTab = `<div id="tab-manuals" class="tab-panel"><div class="content-container">${renderManualsTab(metricsData.manuals)}</div></div>`;
  const kpisTab = renderKpisTabHtml(metricsData);
  return `  <main>\n${graphTab}\n${rtmTab}\n${qualityTab}\n${manualsTab}\n${kpisTab}\n  </main>`;
}

export function renderDashboardHtml(
  graphData: GraphElementsResult,
  metricsData: DashboardMetricsData,
  title: string = 'AI-SDLC: Dashboard Interactivo de Trazabilidad y Calidad',
  generationDate?: string
): string {
  const head = renderDashboardHead(title);
  const effectiveDate = generationDate || resolveDeterministicDate().toISOString();
  const header = renderHeaderHtml(graphData.issueCount, effectiveDate);
  const nav = renderNavTabsHtml();
  const main = renderDashboardMain(metricsData);
  const sidebar = renderTaskSidebarHtml();
  const scripts = renderDashboardScripts(graphData, metricsData);
  return `<!DOCTYPE html>\n<html lang="es">\n${head}\n<body>\n${header}\n${nav}\n${main}\n${sidebar}\n${scripts}\n</body>\n</html>`;
}
