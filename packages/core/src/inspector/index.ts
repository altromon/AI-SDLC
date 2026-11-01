/**
 * AI-SDLC: Element Inspector & Graph Navigator Engine
 * Inspects any AI-SDLC artifact (FR, UC, CMP, ADR, SEC-REQ, TSK, code file, or test suite),
 * generating concise technical summaries, upstream/downstream traceability, and selectable navigation graphs.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  CytoscapeEdgeData,
  CytoscapeElement,
  CytoscapeNodeData,
  InspectOptions,
  InspectRelation,
  InspectResult,
  TaskItem,
} from '../types/index.js';
import { buildGraphElements } from '../reporters/dashboard-graph.js';
import { parseTasksDoc } from '../verifiers/governance.js';
import { parseFrontmatter } from '../verifiers/traceability.js';

const CITATION_REGEX =
  /\b(ARCH-INTRO|JRN|ACT-THREAT|ACT|UC|BR|BC|ABUSE|DATA-ASSET|PRIV-ROPA|HAZ|SEC-ENC|CMP|ADR|SEC-REQ|PRIV-REQ|FR|QR|CHG|TSK|HOF)-[A-Z0-9_-]+/g;

interface DiscoveredTask {
  task: TaskItem;
  changeId: string;
  tasksFilePath: string;
}

function parseTasksFromDir(changeDirPath: string, rootDir: string): DiscoveredTask[] {
  const tasksPath = path.join(changeDirPath, 'tasks.md');
  if (!fs.existsSync(tasksPath)) return [];

  try {
    const raw = fs.readFileSync(tasksPath, 'utf-8');
    const { frontmatter } = parseTasksDoc(raw);
    const changeId = typeof frontmatter['change-id'] === 'string'
      ? frontmatter['change-id']
      : path.basename(changeDirPath);
    const list: DiscoveredTask[] = [];
    if (Array.isArray(frontmatter.tasks)) {
      const relPath = path.relative(rootDir, tasksPath).replace(/\\/g, '/');
      for (const t of frontmatter.tasks) {
        list.push({ task: t, changeId, tasksFilePath: relPath });
      }
    }
    return list;
  } catch {
    return [];
  }
}

function scanTasksInBaseDir(baseDir: string, rootDir: string): DiscoveredTask[] {
  if (!fs.existsSync(baseDir)) return [];
  const acc: DiscoveredTask[] = [];
  try {
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) {
        acc.push(...parseTasksFromDir(path.join(baseDir, e.name), rootDir));
      }
    }
  } catch {
    // Ignore read errors
  }
  return acc;
}

function scanAllTasks(rootDir: string): DiscoveredTask[] {
  const activeDir = path.join(rootDir, 'specs', 'changes', 'active');
  const completedDir = path.join(rootDir, 'specs', 'changes', 'completed');
  return [
    ...scanTasksInBaseDir(activeDir, rootDir),
    ...scanTasksInBaseDir(completedDir, rootDir),
  ];
}

function isSkippableLine(trimmed: string): boolean {
  return (
    trimmed.startsWith('#') ||
    trimmed.startsWith('---') ||
    trimmed.startsWith('|') ||
    trimmed.startsWith('```')
  );
}

function collectTextParagraphs(body: string): string[] {
  const lines = body.split(/\r?\n/);
  const paragraphs: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (isSkippableLine(trimmed) || !trimmed) {
      if (current.length > 0) {
        paragraphs.push(current.join(' '));
        current = [];
      }
      continue;
    }
    current.push(trimmed);
  }

  if (current.length > 0) {
    paragraphs.push(current.join(' '));
  }

  return paragraphs;
}

function extractTechnicalSummary(body: string, fallbackTitle?: string): string {
  if (!body || !body.trim()) {
    return fallbackTitle ? `Elemento ${fallbackTitle}.` : 'Sin descripción detallada.';
  }

  const paras = collectTextParagraphs(body);
  const firstGood = paras.find((p) => p.length > 20 && !p.startsWith('>'));
  if (firstGood) {
    return firstGood.length > 350 ? firstGood.substring(0, 347) + '...' : firstGood;
  }

  return paras[0] || fallbackTitle || 'Sin resumen disponible.';
}

function resolveCitationType(cit: string): string {
  if (cit.startsWith('CMP-')) return 'component';
  if (cit.startsWith('FR-') || cit.startsWith('QR-')) return 'requirement';
  if (cit.startsWith('SEC-REQ-')) return 'security-requirement';
  if (cit.startsWith('PRIV-REQ-')) return 'privacy-requirement';
  if (cit.startsWith('UC-')) return 'use-case';
  if (cit.startsWith('ADR-')) return 'adr';
  return 'artifact';
}

function buildCitationRelations(citations: string[]): InspectRelation[] {
  return citations.map((cit) => ({
    id: cit,
    type: resolveCitationType(cit),
    direction: 'upstream' as const,
    relation: cit.startsWith('CMP-') ? 'implements' : 'satisfies',
  }));
}

function findTasksForCitations(citations: string[], allTasks: DiscoveredTask[]): InspectRelation[] {
  const relations: InspectRelation[] = [];
  for (const dt of allTasks) {
    const t = dt.task;
    const matchesReq = t.satisfiesRequirements?.some((r) => citations.includes(r));
    const matchesCmp = t.implementsComponents?.some((c) => citations.includes(c));
    if (matchesReq || matchesCmp) {
      relations.push({
        id: `${t.id} (${dt.changeId})`,
        type: 'task',
        direction: 'upstream',
        relation: 'developed-by-task',
        title: t.title,
        filePath: dt.tasksFilePath,
      });
    }
  }
  return relations;
}

function isTestNode(e: CytoscapeElement): e is { group: 'nodes'; data: CytoscapeNodeData } {
  if (e.group !== 'nodes') return false;
  const d = e.data as CytoscapeNodeData;
  return d.layer === 'test' || d.type === 'bdd-feature' || d.type === 'code-test';
}

function findTestNodesForCitations(citations: string[], graphElements: CytoscapeElement[]): InspectRelation[] {
  const downstream: InspectRelation[] = [];
  const testNodes = graphElements.filter(isTestNode).map((e) => e.data);

  for (const tn of testNodes) {
    const isMatched = citations.some((c) => tn.content?.includes(c) || tn.title?.includes(c) || tn.id?.includes(c));
    if (isMatched) {
      downstream.push({
        id: tn.label || tn.id,
        type: tn.type || 'test',
        direction: 'downstream',
        relation: 'verified-by',
        title: tn.title,
        filePath: tn.filePath,
      });
    }
  }
  return downstream;
}

function extractKeySymbols(content: string): string[] {
  const fns = Array.from(content.matchAll(/export\s+(?:async\s+)?function\s+([a-zA-Z0-9_]+)/g)).map((m) => m[1]);
  const cls = Array.from(content.matchAll(/export\s+class\s+([a-zA-Z0-9_]+)/g)).map((m) => m[1]);
  const cst = Array.from(content.matchAll(/export\s+const\s+([a-zA-Z0-9_]+)/g)).map((m) => m[1]);
  return [...fns, ...cls, ...cst].slice(0, 6);
}

function buildSourceSummary(ext: string, loc: number, symbols: string[], citations: string[]): string {
  const parts = [
    `Módulo de código fuente (${ext || 'código'}).`,
    `Tamaño: ${loc} líneas de código.`,
  ];
  if (symbols.length > 0) parts.push(`Símbolos clave: ${symbols.join(', ')}.`);
  if (citations.length > 0) parts.push(`Trazabilidad: ${citations.join(', ')}.`);
  return parts.join(' ');
}

/**
 * Deduplicates relations by identifier for clean display in prompts and cards.
 */
function deduplicateRelations(items: InspectRelation[]): InspectRelation[] {
  const map = new Map<string, InspectRelation>();
  for (const item of items) {
    map.set(item.id, item);
  }
  return Array.from(map.values());
}

/**
 * Constructs the source file inspection result with metrics.
 * Attaches extracted citations, line count, and exported symbols.
 */
function buildSourceInspectResult(
  relPath: string,
  summary: string,
  upstream: InspectRelation[],
  downstream: InspectRelation[],
  content: string,
  metrics: { loc: number; ext: string; symbolsCount: number; citationsCount: number }
): InspectResult {
  const relatedItems = deduplicateRelations([...upstream, ...downstream]);

  return {
    found: true,
    query: relPath,
    id: path.basename(relPath),
    title: relPath,
    type: 'source-file',
    layer: 'code',
    filePath: relPath,
    status: 'ACTIVE',
    summary,
    upstream,
    downstream,
    relatedItems,
    metrics: {
      loc: metrics.loc,
      extension: metrics.ext,
      exportedSymbolsCount: metrics.symbolsCount,
      citationsCount: metrics.citationsCount,
    },
    contentPreview: content.substring(0, 1000),
  };
}

/**
 * Inspects a source code file on disk.
 * Extracts embedded requirement citations, exported symbols, and test references.
 */
function inspectSourceCodeFile(
  fullPath: string,
  relPath: string,
  graphElements: CytoscapeElement[],
  allTasks: DiscoveredTask[]
): InspectResult {
  const content = fs.readFileSync(fullPath, 'utf-8');
  const loc = content.split('\n').length;
  const ext = path.extname(fullPath).toLowerCase();
  const citations = Array.from(new Set(content.match(CITATION_REGEX) || []));

  // Extract upstream citations and matching tasks
  const upstream: InspectRelation[] = [
    ...buildCitationRelations(citations),
    ...findTasksForCitations(citations, allTasks),
  ];
  // Extract downstream test suites
  const downstream: InspectRelation[] = findTestNodesForCitations(citations, graphElements);
  const keySymbols = extractKeySymbols(content);
  const summary = buildSourceSummary(ext, loc, keySymbols, citations);

  return buildSourceInspectResult(relPath, summary, upstream, downstream, content, {
    loc,
    ext,
    symbolsCount: keySymbols.length,
    citationsCount: citations.length,
  });
}

function buildTaskUpstreamRelations(
  t: TaskItem,
  changeId: string,
  filePath: string,
  graphNodes: Map<string, CytoscapeNodeData>
): InspectRelation[] {
  const list: InspectRelation[] = [
    { id: changeId, type: 'change-proposal', direction: 'upstream', relation: 'part-of-change', filePath },
  ];

  for (const cmp of t.implementsComponents || []) {
    const node = graphNodes.get(cmp);
    list.push({ id: cmp, type: 'component', direction: 'upstream', relation: 'implements', title: node?.title, filePath: node?.filePath });
  }

  for (const req of t.satisfiesRequirements || []) {
    const node = graphNodes.get(req);
    list.push({ id: req, type: node?.type || 'requirement', direction: 'upstream', relation: 'satisfies', title: node?.title, filePath: node?.filePath });
  }

  return list;
}

function buildTaskVerificationDownstream(t: TaskItem): InspectRelation[] {
  if (!t.verification?.criteria && !t.verification?.method) return [];
  return [{
    id: `${t.verification.method || 'verification'}: ${t.verification.criteria || 'passed'}`,
    type: 'verification-criteria',
    direction: 'downstream',
    relation: 'verified-by-criteria',
  }];
}

function buildTaskSummary(t: TaskItem): string {
  const mode = t.autonomyMode || 'AUTONOMOUS';
  const assigned = t.assignedTo || 'agent-developer';
  const c = t.complexity || 'MEDIUM';
  const r = t.riskLevel || 'LOW';
  const s = t.status || 'PENDING';
  return `Tarea [${mode}] asignada a ${assigned}. Complejidad: ${c}, Riesgo: ${r}. Estado: ${s}.`;
}

/**
 * Inspects a discovered SDD task from tasks.md.
 * Populates governance metadata, complexity, autonomy mode, and criteria.
 */
function inspectDiscoveredTask(
  dt: DiscoveredTask,
  graphNodes: Map<string, CytoscapeNodeData>
): InspectResult {
  const t = dt.task;
  // Build upstream relations
  const upstream = buildTaskUpstreamRelations(t, dt.changeId, dt.tasksFilePath, graphNodes);
  // Build downstream verification relations
  const downstream = buildTaskVerificationDownstream(t);
  // Build human-readable technical summary
  const summary = buildTaskSummary(t);
  const relatedItems = deduplicateRelations([...upstream, ...downstream]);

  return {
    found: true,
    query: t.id,
    id: t.id,
    title: t.title || t.id,
    type: 'task',
    layer: 'governance',
    filePath: dt.tasksFilePath,
    status: t.status || 'ACTIVE',
    summary,
    upstream,
    downstream,
    relatedItems,
    metrics: { autonomyMode: t.autonomyMode, complexity: t.complexity, riskLevel: t.riskLevel, status: t.status },
  };
}

function inspectDirectFile(
  directPath: string,
  rootDir: string,
  options: InspectOptions
): InspectResult | null {
  if (!fs.existsSync(directPath) || !fs.statSync(directPath).isFile()) {
    return null;
  }
  const relFile = path.relative(rootDir, directPath).replace(/\\/g, '/');
  const ext = path.extname(directPath).toLowerCase();

  if (ext === '.md') {
    try {
      const rawContent = fs.readFileSync(directPath, 'utf-8');
      const { frontmatter } = parseFrontmatter(rawContent);
      if (frontmatter.id && typeof frontmatter.id === 'string') {
        const sub = inspectElement(frontmatter.id, options);
        sub.filePath = relFile;
        return sub;
      }
    } catch {
      // Continue to source code inspection
    }
  }

  const graphRes = buildGraphElements(rootDir);
  const allTasks = scanAllTasks(rootDir);
  return inspectSourceCodeFile(directPath, relFile, graphRes.elements, allTasks);
}

function findTargetNode(
  normQuery: string,
  nodeMap: Map<string, CytoscapeNodeData>
): CytoscapeNodeData | undefined {
  const direct = nodeMap.get(normQuery) ||
    Array.from(nodeMap.values()).find((n) => n.id.toLowerCase() === normQuery);
  if (direct) return direct;

  return Array.from(nodeMap.values()).find(
    (n) => (n.title && n.title.toLowerCase().includes(normQuery)) ||
           (n.filePath && n.filePath.toLowerCase().includes(normQuery))
  );
}

function collectIncomingEdges(nodeId: string, edges: CytoscapeEdgeData[], nodeMap: Map<string, CytoscapeNodeData>): InspectRelation[] {
  const upstream: InspectRelation[] = [];
  for (const e of edges) {
    if (e.target === nodeId) {
      const srcNode = nodeMap.get(e.source);
      upstream.push({
        id: e.source,
        type: srcNode?.type || 'artifact',
        direction: 'upstream',
        relation: e.relation || 'derives-from',
        title: srcNode?.title,
        filePath: srcNode?.filePath,
      });
    }
  }
  return upstream;
}

function collectOutgoingEdges(nodeId: string, edges: CytoscapeEdgeData[], nodeMap: Map<string, CytoscapeNodeData>): InspectRelation[] {
  const downstream: InspectRelation[] = [];
  for (const e of edges) {
    if (e.source === nodeId) {
      const tgtNode = nodeMap.get(e.target);
      downstream.push({
        id: e.target,
        type: tgtNode?.type || 'artifact',
        direction: 'downstream',
        relation: e.relation || 'satisfies',
        title: tgtNode?.title,
        filePath: tgtNode?.filePath,
      });
    }
  }
  return downstream;
}

function collectNodeEdges(
  nodeId: string,
  edges: CytoscapeEdgeData[],
  nodeMap: Map<string, CytoscapeNodeData>
): { upstream: InspectRelation[]; downstream: InspectRelation[] } {
  return {
    upstream: collectIncomingEdges(nodeId, edges, nodeMap),
    downstream: collectOutgoingEdges(nodeId, edges, nodeMap),
  };
}

function attachTasksToNodeRelations(
  nodeId: string,
  allTasks: DiscoveredTask[],
  downstream: InspectRelation[]
): void {
  for (const dt of allTasks) {
    const t = dt.task;
    const satisfiesThis = t.satisfiesRequirements?.includes(nodeId);
    const implementsThis = t.implementsComponents?.includes(nodeId);
    if (satisfiesThis || implementsThis) {
      downstream.push({
        id: `${t.id} (${dt.changeId})`,
        type: 'task',
        direction: 'downstream',
        relation: implementsThis ? 'implements-component' : 'satisfies-requirement',
        title: t.title,
        filePath: dt.tasksFilePath,
      });
    }
  }
}

function buildNotFoundResult(trimmed: string, nodeMap: Map<string, CytoscapeNodeData>): InspectResult {
  const normQuery = trimmed.toLowerCase();
  const suggestions = Array.from(nodeMap.values())
    .filter((n) => n.id.toLowerCase().includes(normQuery.substring(0, 4)) || (n.title && n.title.toLowerCase().includes(normQuery.substring(0, 4))))
    .slice(0, 5)
    .map((n) => ({
      id: n.id,
      type: n.type,
      direction: 'bidirectional' as const,
      relation: 'suggestion',
      title: n.title,
      filePath: n.filePath,
    }));

  return {
    found: false,
    query: trimmed,
    summary: `No se encontró ningún elemento o archivo coincidente con "${trimmed}". Revisa el identificador o la ruta relativa.`,
    upstream: [],
    downstream: [],
    relatedItems: suggestions,
  };
}

/**
 * Resolves inspection details for a matched Cytoscape node.
 * Calculates incoming and outgoing edges and connects related tasks.
 */
function inspectMatchedNode(
  matchedNode: CytoscapeNodeData,
  trimmed: string,
  edges: CytoscapeEdgeData[],
  nodeMap: Map<string, CytoscapeNodeData>,
  allTasks: DiscoveredTask[]
): InspectResult {
  // Collect upstream and downstream edge connections
  const { upstream, downstream } = collectNodeEdges(matchedNode.id, edges, nodeMap);
  attachTasksToNodeRelations(matchedNode.id, allTasks, downstream);

  // Extract technical overview
  const summary = extractTechnicalSummary(matchedNode.content || '', matchedNode.title);
  const relatedItems = deduplicateRelations([...upstream, ...downstream]);

  return {
    found: true,
    query: trimmed,
    id: matchedNode.id,
    title: matchedNode.title || matchedNode.label || matchedNode.id,
    type: matchedNode.type,
    layer: matchedNode.layer,
    filePath: matchedNode.filePath,
    status: matchedNode.status || 'COMPLIANT',
    summary,
    upstream,
    downstream,
    relatedItems,
    contentPreview: matchedNode.content ? matchedNode.content.substring(0, 1500) : undefined,
  };
}

function resolveTargetMatch(
  normQuery: string,
  nodeMap: Map<string, CytoscapeNodeData>,
  allTasks: DiscoveredTask[],
  edges: CytoscapeEdgeData[],
  trimmed: string
): InspectResult {
  // Check task by ID
  const matchedTask = allTasks.find(
    (dt) => dt.task.id.toLowerCase() === normQuery || `${dt.changeId}/${dt.task.id}`.toLowerCase() === normQuery
  );
  if (matchedTask && normQuery.startsWith('tsk-')) {
    return inspectDiscoveredTask(matchedTask, nodeMap);
  }

  // Check graph node
  const matchedNode = findTargetNode(normQuery, nodeMap);
  if (matchedNode) {
    return inspectMatchedNode(matchedNode, trimmed, edges, nodeMap, allTasks);
  }
  if (matchedTask) {
    return inspectDiscoveredTask(matchedTask, nodeMap);
  }

  return buildNotFoundResult(trimmed, nodeMap);
}

/**
 * Inspect any AI-SDLC artifact, code file, task, or test by query (ID or path).
 */
export function inspectElement(query: string, options: InspectOptions = {}): InspectResult {
  const rootDir = options.rootDir || process.cwd();
  const trimmed = query.trim();

  // 1. Direct file check
  const directPath = path.isAbsolute(trimmed) ? trimmed : path.join(rootDir, trimmed);
  const fileRes = inspectDirectFile(directPath, rootDir, options);
  if (fileRes) return fileRes;

  // 2. Build graph elements from workspace
  const graphRes = buildGraphElements(rootDir);
  const nodeMap = new Map<string, CytoscapeNodeData>();
  for (const e of graphRes.elements) {
    if (e.group === 'nodes') {
      const d = e.data as CytoscapeNodeData;
      nodeMap.set(d.id, d);
    }
  }
  const edges = graphRes.elements
    .filter((e) => e.group === 'edges')
    .map((e) => e.data as CytoscapeEdgeData);

  const allTasks = scanAllTasks(rootDir);
  return resolveTargetMatch(trimmed.toLowerCase(), nodeMap, allTasks, edges, trimmed);
}

function formatRelationsBlock(title: string, list: InspectRelation[], arrow: string): string[] {
  if (list.length === 0) return [];
  const lines = [title];
  for (const item of list) {
    const titleSuffix = item.title ? ` — *${item.title}*` : '';
    lines.push(`- ${arrow} **\`${item.id}\`** (\`${item.type}\`) [${item.relation}]${titleSuffix}`);
  }
  lines.push('');
  return lines;
}

function formatRelatedNavBlock(list: InspectRelation[]): string[] {
  if (list.length === 0) return [];
  const lines = ['#### 📋 Elementos Navegables (Seleccionables para continuar navegación):'];
  let index = 1;
  for (const item of list) {
    const arrow = item.direction === 'upstream' ? '↗️' : item.direction === 'downstream' ? '↘️' : '↔️';
    lines.push(`${index}. ${arrow} **\`${item.id}\`** (\`${item.type}\` — *${item.relation}*)`);
    index++;
  }
  lines.push('');
  return lines;
}

function formatNotFoundMarkdown(result: InspectResult): string {
  const lines = [`### ❌ Elemento no encontrado: \`${result.query}\``, '', result.summary];
  if (result.relatedItems.length > 0) {
    lines.push('', '#### Sugerencias cercanas:');
    for (const s of result.relatedItems) {
      lines.push(`- **\`${s.id}\`** (${s.type}): ${s.title || 'Sin título'}`);
    }
  }
  return lines.join('\n');
}

/**
 * Format an InspectResult into GitHub-flavored Markdown for display in Chat and CLI.
 */
export function formatInspectResultMarkdown(result: InspectResult): string {
  if (!result.found) return formatNotFoundMarkdown(result);

  const lines: string[] = [
    `### 🔍 Inspección: \`${result.id || result.query}\`${result.title && result.title !== result.id ? ` — ${result.title}` : ''}`,
    '',
    `- **Tipo:** \`${result.type || 'N/A'}\` | **Capa:** \`${result.layer || 'N/A'}\` | **Estado:** \`${result.status || 'COMPLIANT'}\``,
    result.filePath ? `- **Ubicación:** \`${result.filePath}\`` : '',
    '',
    '#### 📝 Resumen Técnico:',
    result.summary,
    '',
    ...formatRelationsBlock('#### 🔗 Relaciones Upstream (Deriva de / Mitiga / Alineado con):', result.upstream, '↗️'),
    ...formatRelationsBlock('#### 🔗 Relaciones Downstream (Satisfecho por / Verificado por / Implementado en):', result.downstream, '↘️'),
    ...formatRelatedNavBlock(result.relatedItems),
  ].filter((l) => l !== '');

  return lines.join('\n');
}
