/**
 * AI-SDLC: Cytoscape Graph Elements Builder
 * Scans workspace artifacts and RTM traceability to build Graph Elements for Cytoscape.js.
 */

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import {
  CytoscapeEdgeData,
  CytoscapeElement,
  CytoscapeNodeData,
  GraphNodeLayer,
  GraphNodeStatus,
  TraceabilityRow,
} from '../types/index.js';
import { verifyPdacGraph } from '../verifiers/pdac-graph.js';
import { verifyTraceability } from '../verifiers/traceability.js';
import { walkMdFiles } from '../utils/fs.js';

export interface GraphElementsResult {
  elements: CytoscapeElement[];
  nodesByLayer: Record<GraphNodeLayer, number>;
  conformingCount: number;
  issueCount: number;
}

export interface ScannedArtifact {
  id: string;
  type: string;
  title: string;
  layer: GraphNodeLayer;
  filePath: string;
  content: string;
  frontmatter: Record<string, unknown>;
}

const NON_GRAPH_TYPES = new Set([
  'term', 'handoff', 'agent-handoff', 'tasks', 'task-plan',
  'spec-change-proposal', 'proposal', 'spec-design', 'spec-change-design',
  'design', 'delivery-spec', 'spec', 'pre-merge-audit-report',
  'user-design-feedback', 'release-kpis', 'session-telemetry',
  'license-manifest', 'mcp-config', 'user-manual', 'production-manual',
  'architecture-glossary', 'dpia-request', 'privacy-policy',
]);

const PREFIX_MAP: Record<string, { type: string; layer: GraphNodeLayer }> = {
  'ARCH-INTRO': { type: 'architecture-introduction', layer: 'product' },
  'JRN': { type: 'journey', layer: 'product' },
  'ACT-THREAT': { type: 'threat-actor', layer: 'product' },
  'ACT': { type: 'actor', layer: 'product' },
  'UC': { type: 'use-case', layer: 'product' },
  'BR': { type: 'business-rule', layer: 'product' },
  'ABUSE': { type: 'abuse-case', layer: 'product' },
  'DATA-ASSET': { type: 'data-asset', layer: 'product' },
  'PRIV-ROPA': { type: 'privacy-ropa', layer: 'product' },
  'HAZ': { type: 'hazard', layer: 'product' },
  'SEC-ENC': { type: 'security-enclave', layer: 'architecture' },
  'CMP': { type: 'component', layer: 'architecture' },
  'ADR': { type: 'adr', layer: 'architecture' },
  'SEC-REQ': { type: 'security-requirement', layer: 'requirement' },
  'PRIV-REQ': { type: 'privacy-requirement', layer: 'requirement' },
};

const TYPE_LOOKUP: Record<string, { type: string; layer: GraphNodeLayer }> = {
  'architecture-introduction': { type: 'architecture-introduction', layer: 'product' },
  'journey': { type: 'journey', layer: 'product' },
  'threat-actor': { type: 'threat-actor', layer: 'product' },
  'actor': { type: 'actor', layer: 'product' },
  'use-case': { type: 'use-case', layer: 'product' },
  'usecase': { type: 'use-case', layer: 'product' },
  'business-rule': { type: 'business-rule', layer: 'product' },
  'rule': { type: 'business-rule', layer: 'product' },
  'abuse-case': { type: 'abuse-case', layer: 'product' },
  'data-asset': { type: 'data-asset', layer: 'product' },
  'privacy-ropa': { type: 'privacy-ropa', layer: 'product' },
  'hazard': { type: 'hazard', layer: 'product' },
  'security-enclave': { type: 'security-enclave', layer: 'architecture' },
  'component': { type: 'component', layer: 'architecture' },
  'architecture-decision-record': { type: 'adr', layer: 'architecture' },
  'adr': { type: 'adr', layer: 'architecture' },
  'security-requirement': { type: 'security-requirement', layer: 'requirement' },
  'privacy-requirement': { type: 'privacy-requirement', layer: 'requirement' },
};

export function classifyArtifactLayerAndType(
  id: string,
  declaredType: string
): { type: string; layer: GraphNodeLayer } | null {
  if (NON_GRAPH_TYPES.has(declaredType) || /^(TERM|HOF|AHOF|CHG|DSG|SPEC|TSK|UDF|AUDIT|DPIA)-/.test(id)) {
    return null;
  }
  for (const [prefix, mapping] of Object.entries(PREFIX_MAP)) {
    if (id.startsWith(`${prefix}-`)) return mapping;
  }
  if (TYPE_LOOKUP[declaredType]) return TYPE_LOOKUP[declaredType];
  return { type: declaredType || 'product', layer: 'product' };
}

function extractFrontmatter(fileContent: string): Record<string, unknown> | null {
  const match = fileContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  try {
    return (yaml.load(match[1]) as Record<string, unknown>) || null;
  } catch {
    return null;
  }
}

function toScannedArtifact(filePath: string, relPath: string): ScannedArtifact | null {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const fm = extractFrontmatter(fileContent);
  const id = typeof fm?.id === 'string' ? fm.id.trim() : '';
  if (!id) return null;

  const declaredType = typeof fm?.type === 'string' ? fm.type.trim() : '';
  const classified = classifyArtifactLayerAndType(id, declaredType);
  if (!classified) return null;

  const title = typeof fm?.title === 'string' ? fm.title.trim() : id;
  const content = fileContent.replace(/^---\r?\n[\s\S]*?\r?\n---/, '').trim();
  return { id, type: classified.type, title, layer: classified.layer, filePath: relPath, content, frontmatter: fm! };
}

function parseAndCatalogArtifactFile(
  rootDir: string,
  filePath: string,
  scannedMap: Map<string, ScannedArtifact>,
  archViewByBasename: Map<string, ScannedArtifact>
): void {
  const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
  if (relPath.includes('/changes/') || relPath.startsWith('changes/')) return;
  const scannedArt = toScannedArtifact(filePath, relPath);
  if (!scannedArt) return;

  if (scannedArt.layer === 'architecture' && scannedArt.type === 'architecture') {
    archViewByBasename.set(path.basename(relPath), scannedArt);
  } else {
    scannedMap.set(scannedArt.id, scannedArt);
  }
}

export function scanWorkspaceArtifacts(rootDir: string) {
  const scannedArtifactsMap = new Map<string, ScannedArtifact>();
  const archViewByBasename = new Map<string, ScannedArtifact>();
  const artifactDirs = ['product', 'architecture', 'specs', 'security', 'privacy'];
  for (const dirName of artifactDirs) {
    const fullDirPath = path.join(rootDir, dirName);
    if (fs.existsSync(fullDirPath)) {
      for (const f of walkMdFiles(fullDirPath)) {
        parseAndCatalogArtifactFile(rootDir, f, scannedArtifactsMap, archViewByBasename);
      }
    }
  }
  return { scannedArtifactsMap, archViewByBasename };
}

function resolveUpstreamType(u: string): string {
  if (u.startsWith('ARCH-INTRO-')) return 'architecture-introduction';
  if (u.startsWith('ACT-')) return 'actor';
  if (u.startsWith('UC-')) return 'use-case';
  if (u.startsWith('BR-')) return 'business-rule';
  if (u.startsWith('ABUSE-')) return 'abuse-case';
  if (u.startsWith('DATA-ASSET-')) return 'data-asset';
  if (u.startsWith('PRIV-ROPA-')) return 'privacy-ropa';
  return 'product';
}

function addTraceUpstreamEdges(
  r: TraceabilityRow,
  status: GraphNodeStatus,
  nodeMap: Map<string, CytoscapeNodeData>,
  addEdge: (e: CytoscapeEdgeData) => void
): void {
  for (const up of r.productTraces.split(',')) {
    const u = up.trim();
    if (!u || u === 'NINGUNO' || u === 'NONE') continue;
    const isAbuse = u.startsWith('ABUSE-');
    const isArchIntro = u.startsWith('ARCH-INTRO-');
    const rel = isAbuse ? 'mitigated-by' : isArchIntro ? 'defines-goal' : 'derives-from';
    addEdge({ id: `edge-${u}-${r.id}`, source: u, target: r.id, label: rel, relation: rel, status });
    if (!nodeMap.has(u)) {
      nodeMap.set(u, { id: u, label: u, title: u, type: resolveUpstreamType(u), layer: 'product', status: 'COMPLIANT' });
    }
  }
}

function resolveArchType(a: string): string {
  if (a.startsWith('CMP-')) return 'component';
  if (a.startsWith('ADR-')) return 'adr';
  if (a.startsWith('SEC-ENC-')) return 'security-enclave';
  return 'architecture';
}

function ensureArchNode(
  a: string,
  archViewByBasename: Map<string, ScannedArtifact>,
  nodeMap: Map<string, CytoscapeNodeData>
): void {
  if (nodeMap.has(a)) return;
  const viewArt = archViewByBasename.get(a);
  nodeMap.set(a, {
    id: a,
    label: a,
    title: viewArt?.title || a,
    type: resolveArchType(a),
    layer: 'architecture',
    status: 'COMPLIANT',
    filePath: viewArt?.filePath,
    content: viewArt?.content,
  });
}

function addTraceArchEdges(
  r: TraceabilityRow,
  status: GraphNodeStatus,
  archViewByBasename: Map<string, ScannedArtifact>,
  nodeMap: Map<string, CytoscapeNodeData>,
  addEdge: (e: CytoscapeEdgeData) => void
): void {
  for (const arch of r.archTraces.split(',')) {
    const a = arch.trim();
    if (!a || a === 'NINGUNO' || a === 'NONE') continue;
    addEdge({ id: `edge-${r.id}-${a}`, source: r.id, target: a, label: 'satisfies', relation: 'satisfies', status });
    ensureArchNode(a, archViewByBasename, nodeMap);
  }
}

function loadTestContentPreview(filePath: string): string | undefined {
  if (!fs.existsSync(filePath)) return undefined;
  try {
    const testContent = fs.readFileSync(filePath, 'utf-8');
    const lang = filePath.endsWith('.feature') ? 'gherkin' : 'typescript';
    const preview = testContent.substring(0, 1500) + (testContent.length > 1500 ? '\n... (truncated)' : '');
    return '```' + lang + '\n' + preview + '\n```';
  } catch {
    return undefined;
  }
}

function ensureTestNode(t: string, testId: string, rootDir: string, nodeMap: Map<string, CytoscapeNodeData>): void {
  if (nodeMap.has(testId)) return;
  const fullTestPath = path.isAbsolute(t) ? t : path.join(rootDir, t);
  nodeMap.set(testId, {
    id: testId,
    label: path.basename(t),
    title: t,
    type: t.endsWith('.feature') ? 'bdd-feature' : 'code-test',
    layer: 'test',
    status: 'COMPLIANT',
    filePath: t,
    content: loadTestContentPreview(fullTestPath),
  });
}

function addTraceTestEdges(
  r: TraceabilityRow,
  status: GraphNodeStatus,
  rootDir: string,
  nodeMap: Map<string, CytoscapeNodeData>,
  addEdge: (e: CytoscapeEdgeData) => void
): void {
  for (const tst of r.testTraces.split(',')) {
    const t = tst.trim();
    if (!t || t === 'NINGUNO' || t === 'NONE') continue;
    const testId = t.replace(/[^a-zA-Z0-9_-]/g, '_');
    addEdge({ id: `edge-${r.id}-${testId}`, source: r.id, target: testId, label: 'verified-by', relation: 'verified-by', status });
    ensureTestNode(t, testId, rootDir, nodeMap);
  }
}

function buildReqNode(r: TraceabilityRow, status: GraphNodeStatus): CytoscapeNodeData {
  const reqType = r.id.startsWith('SEC-REQ-')
    ? 'security-requirement'
    : r.id.startsWith('PRIV-REQ-')
      ? 'privacy-requirement'
      : 'requirement';
  return {
    id: r.id,
    label: r.id,
    title: r.title,
    type: reqType,
    layer: 'requirement',
    status,
    content: r.content,
    filePath: r.filePath,
    details: { productStatus: r.productStatus, archStatus: r.archStatus, testStatus: r.testStatus, hofId: r.hofId },
    upstream: r.productTraces.split(',').map((s) => s.trim()).filter(Boolean),
    downstream: [
      ...r.archTraces.split(',').map((s) => s.trim()).filter(Boolean),
      ...r.testTraces.split(',').map((s) => s.trim()).filter(Boolean),
    ],
  };
}

export function processTraceabilityRequirements(
  rows: TraceabilityRow[],
  archViewByBasename: Map<string, ScannedArtifact>,
  rootDir: string,
  nodeMap: Map<string, CytoscapeNodeData>,
  addEdge: (e: CytoscapeEdgeData) => void
): void {
  for (const r of rows) {
    const isOk =
      (r.productStatus === 'COMPLIANT' || r.productStatus === 'CONFORME') &&
      (r.archStatus === 'COMPLIANT' || r.archStatus === 'CONFORME') &&
      (r.testStatus === 'COMPLIANT' || r.testStatus === 'CONFORME');
    const status: GraphNodeStatus = isOk ? 'COMPLIANT' : 'ORPHAN';
    nodeMap.set(r.id, buildReqNode(r, status));
    addTraceUpstreamEdges(r, status, nodeMap, addEdge);
    addTraceArchEdges(r, status, archViewByBasename, nodeMap, addEdge);
    addTraceTestEdges(r, status, rootDir, nodeMap, addEdge);
  }
}

const GENERIC_TYPES = new Set(['', 'product', 'architecture', 'usecase', 'rule']);

function enrichExistingNode(n: CytoscapeNodeData, art: ScannedArtifact): void {
  if (!n.filePath) n.filePath = art.filePath;
  if ((!n.title || n.title === n.id) && art.title) n.title = art.title;
  if (!n.content) n.content = art.content;
  if (art.type && GENERIC_TYPES.has(n.type)) n.type = art.type;
}

export function registerScannedArtifactNodes(
  scannedMap: Map<string, ScannedArtifact>,
  nodeMap: Map<string, CytoscapeNodeData>
): void {
  for (const art of scannedMap.values()) {
    if (!nodeMap.has(art.id)) {
      nodeMap.set(art.id, {
        id: art.id,
        label: art.id,
        title: art.title,
        type: art.type,
        layer: art.layer,
        status: 'COMPLIANT',
        filePath: art.filePath,
        content: art.content,
      });
    } else {
      enrichExistingNode(nodeMap.get(art.id)!, art);
    }
  }
}

function ensureNodeExists(
  id: string,
  nodeMap: Map<string, CytoscapeNodeData>,
  fallbackType?: string,
  fallbackLayer: GraphNodeLayer = 'product'
): void {
  if (!nodeMap.has(id)) {
    const classification = classifyArtifactLayerAndType(id, fallbackType || '');
    const type = classification?.type || fallbackType || 'product';
    const layer = classification?.layer || fallbackLayer;
    nodeMap.set(id, {
      id,
      label: id,
      title: id,
      type,
      layer,
      status: 'COMPLIANT',
    });
  }
}

function connectTargets(
  sourceId: string,
  rawTargets: unknown,
  relation: string,
  nodeMap: Map<string, CytoscapeNodeData>,
  addEdge: (e: CytoscapeEdgeData) => void,
  defaultType?: string,
  defaultLayer: GraphNodeLayer = 'product'
): void {
  const list = Array.isArray(rawTargets) ? rawTargets : (typeof rawTargets === 'string' ? [rawTargets] : []);
  for (const item of list) {
    if (typeof item === 'string' && item.trim()) {
      const targetId = item.trim();
      ensureNodeExists(sourceId, nodeMap, defaultType, defaultLayer);
      ensureNodeExists(targetId, nodeMap, defaultType, defaultLayer);
      addEdge({ id: `edge-${sourceId}-${targetId}`, source: sourceId, target: targetId, label: relation, relation, status: 'COMPLIANT' });
    }
  }
}

function connectIntroRelationships(
  art: ScannedArtifact,
  nodeMap: Map<string, CytoscapeNodeData>,
  addEdge: (e: CytoscapeEdgeData) => void
): void {
  const fm = art.frontmatter;
  connectTargets(art.id, fm['cites-product-actors'], 'identifies', nodeMap, addEdge, 'actor', 'product');
  connectTargets(art.id, fm['cites-use-cases'], 'envisions', nodeMap, addEdge, 'use-case', 'product');
  const citedGoals = fm['cites-quality-goals'];
  const list = Array.isArray(citedGoals) ? citedGoals : [];
  for (const qrId of list) {
    if (typeof qrId === 'string' && qrId.trim()) {
      const q = qrId.trim();
      const qType = q.startsWith('SEC-REQ-')
        ? 'security-requirement'
        : q.startsWith('PRIV-REQ-')
          ? 'privacy-requirement'
          : 'requirement';
      connectTargets(art.id, [q], 'defines-goal', nodeMap, addEdge, qType, 'requirement');
    }
  }
}

function connectJourneyRelationships(
  art: ScannedArtifact,
  nodeMap: Map<string, CytoscapeNodeData>,
  addEdge: (e: CytoscapeEdgeData) => void
): void {
  const fm = art.frontmatter;
  const persona = typeof fm.persona === 'string' ? fm.persona : (typeof fm.actor === 'string' ? fm.actor : undefined);
  if (persona) {
    connectTargets(persona, [art.id], 'pursues', nodeMap, addEdge, 'actor', 'product');
  }
  const relatedUcs = fm['related-use-cases'] || fm['use-cases'];
  connectTargets(art.id, relatedUcs, 'decomposes-into', nodeMap, addEdge, 'use-case', 'product');
}

function toList(val: unknown): string[] {
  if (Array.isArray(val)) return val.filter((x): x is string => typeof x === 'string');
  if (typeof val === 'string') return [val];
  return [];
}

function connectActors(actors: unknown, targetId: string, nodeMap: Map<string, CytoscapeNodeData>, addEdge: (e: CytoscapeEdgeData) => void): void {
  for (const a of toList(actors)) {
    connectTargets(a, [targetId], 'initiates', nodeMap, addEdge, 'actor', 'product');
  }
}

function connectRules(rules: unknown, targetId: string, nodeMap: Map<string, CytoscapeNodeData>, addEdge: (e: CytoscapeEdgeData) => void): void {
  for (const r of toList(rules)) {
    connectTargets(r, [targetId], 'governs', nodeMap, addEdge, 'business-rule', 'product');
  }
}

function connectUseCaseRelationships(
  art: ScannedArtifact,
  nodeMap: Map<string, CytoscapeNodeData>,
  addEdge: (e: CytoscapeEdgeData) => void
): void {
  const fm = art.frontmatter;
  const primaryActor = fm['primary-actor'] || fm.actor;
  if (typeof primaryActor === 'string') {
    connectTargets(primaryActor, [art.id], 'initiates', nodeMap, addEdge, 'actor', 'product');
  }
  connectActors(fm['supporting-actors'] || fm['secondary-actors'], art.id, nodeMap, addEdge);
  connectRules(fm['governed-by'] || fm['business-rules'], art.id, nodeMap, addEdge);
}

function connectBusinessRuleRelationships(
  art: ScannedArtifact,
  addEdge: (e: CytoscapeEdgeData) => void
): void {
  for (const tgt of toList(art.frontmatter['governs'] || art.frontmatter['applies-to'])) {
    const t = tgt.trim();
    if (t) {
      addEdge({ id: `edge-${art.id}-${t}`, source: art.id, target: t, label: 'governs', relation: 'governs', status: 'COMPLIANT' });
    }
  }
}

function connectSecondaryThreatActors(actors: unknown, targetId: string, nodeMap: Map<string, CytoscapeNodeData>, addEdge: (e: CytoscapeEdgeData) => void): void {
  for (const sa of toList(actors)) {
    const type = sa.startsWith('ACT-THREAT-') ? 'threat-actor' : 'actor';
    connectTargets(sa, [targetId], 'threatens', nodeMap, addEdge, type, 'product');
  }
}

function connectAbuseTargets(targets: unknown, sourceId: string, nodeMap: Map<string, CytoscapeNodeData>, addEdge: (e: CytoscapeEdgeData) => void): void {
  for (const t of toList(targets)) {
    const id = t.trim();
    if (nodeMap.has(id)) {
      addEdge({ id: `edge-${sourceId}-${id}`, source: sourceId, target: id, label: 'targets', relation: 'targets', status: 'COMPLIANT' });
    }
  }
}

function connectAbuseMitigations(mitigations: unknown, sourceId: string, nodeMap: Map<string, CytoscapeNodeData>, addEdge: (e: CytoscapeEdgeData) => void): void {
  for (const s of toList(mitigations)) {
    const id = s.trim();
    if (id) {
      const sType = id.startsWith('SEC-REQ-') ? 'security-requirement' : 'requirement';
      connectTargets(sourceId, [id], 'mitigated-by', nodeMap, addEdge, sType, 'requirement');
    }
  }
}

function connectAbuseCaseRelationships(
  art: ScannedArtifact,
  nodeMap: Map<string, CytoscapeNodeData>,
  addEdge: (e: CytoscapeEdgeData) => void
): void {
  const fm = art.frontmatter;
  const threatActor = fm['primary-threat-actor'] || fm['threat-actor'] || fm.actor;
  if (typeof threatActor === 'string') {
    connectTargets(threatActor, [art.id], 'threatens', nodeMap, addEdge, 'threat-actor', 'product');
  }
  connectSecondaryThreatActors(fm['secondary-actors'] || fm['supporting-actors'], art.id, nodeMap, addEdge);
  connectAbuseTargets(fm['targets-use-case'] || fm['targets-use-cases'] || fm['targets'], art.id, nodeMap, addEdge);
  connectAbuseMitigations(fm['mitigated-by'], art.id, nodeMap, addEdge);
}

function connectDataAssetRelationships(
  art: ScannedArtifact,
  nodeMap: Map<string, CytoscapeNodeData>,
  addEdge: (e: CytoscapeEdgeData) => void
): void {
  const fm = art.frontmatter;
  for (const subj of toList(fm['data-subjects'])) {
    connectTargets(subj.trim(), [art.id], 'owns-data', nodeMap, addEdge, 'actor', 'product');
  }
  const owner = typeof fm['owner-bounded-context'] === 'string' ? fm['owner-bounded-context'].trim() : '';
  if (owner && owner.startsWith('CMP-')) {
    connectTargets(art.id, [owner], 'satisfies', nodeMap, addEdge, 'component', 'architecture');
  }
}

function connectPrivacyRopaRelationships(
  art: ScannedArtifact,
  nodeMap: Map<string, CytoscapeNodeData>,
  addEdge: (e: CytoscapeEdgeData) => void
): void {
  const fm = art.frontmatter;
  for (const uc of toList(fm['use-cases'])) {
    connectTargets(uc.trim(), [art.id], 'derives-from', nodeMap, addEdge, 'use-case', 'product');
  }
  for (const asset of toList(fm['data-assets'])) {
    connectTargets(asset.trim(), [art.id], 'governs', nodeMap, addEdge, 'data-asset', 'product');
  }
  for (const req of toList(fm['mitigated-by'])) {
    connectTargets(art.id, [req.trim()], 'mitigated-by', nodeMap, addEdge, 'privacy-requirement', 'requirement');
  }
}

function connectRequirementMitigations(
  art: ScannedArtifact,
  nodeMap: Map<string, CytoscapeNodeData>,
  addEdge: (e: CytoscapeEdgeData) => void
): void {
  for (const ab of toList(art.frontmatter['mitigates-abuse-case'])) {
    const id = ab.trim();
    if (id) {
      connectTargets(id, [art.id], 'mitigated-by', nodeMap, addEdge, 'abuse-case', 'product');
    }
  }
  for (const ropa of toList(art.frontmatter['governs-ropa'])) {
    const id = ropa.trim();
    if (id) {
      connectTargets(id, [art.id], 'mitigated-by', nodeMap, addEdge, 'privacy-ropa', 'product');
    }
  }
  for (const asset of toList(art.frontmatter['protects-data-assets'])) {
    const id = asset.trim();
    if (id) {
      connectTargets(id, [art.id], 'governs', nodeMap, addEdge, 'data-asset', 'product');
    }
  }
}

function connectAdrRelationships(art: ScannedArtifact, nodeMap: Map<string, CytoscapeNodeData>, addEdge: (e: CytoscapeEdgeData) => void): void {
  for (const cmp of toList(art.frontmatter['affects-components'])) {
    const id = cmp.trim();
    if (nodeMap.has(id)) {
      addEdge({ id: `edge-${art.id}-${id}`, source: art.id, target: id, label: 'governs', relation: 'governs', status: 'COMPLIANT' });
    }
  }
}

function connectEnclaveRelationships(art: ScannedArtifact, nodeMap: Map<string, CytoscapeNodeData>, addEdge: (e: CytoscapeEdgeData) => void): void {
  for (const sec of toList(art.frontmatter['enforced-by'])) {
    const id = sec.trim();
    if (nodeMap.has(id)) {
      addEdge({ id: `edge-${id}-${art.id}`, source: id, target: art.id, label: 'satisfies', relation: 'satisfies', status: 'COMPLIANT' });
    }
  }
}

type ConnectorFn = (art: ScannedArtifact, nodeMap: Map<string, CytoscapeNodeData>, addEdge: (e: CytoscapeEdgeData) => void) => void;

const CONNECTOR_MAP: Record<string, ConnectorFn> = {
  'architecture-introduction': connectIntroRelationships,
  'journey': connectJourneyRelationships,
  'use-case': connectUseCaseRelationships,
  'business-rule': (art, _map, addEdge) => connectBusinessRuleRelationships(art, addEdge),
  'abuse-case': connectAbuseCaseRelationships,
  'data-asset': connectDataAssetRelationships,
  'privacy-ropa': connectPrivacyRopaRelationships,
  'requirement': connectRequirementMitigations,
  'security-requirement': connectRequirementMitigations,
  'privacy-requirement': connectRequirementMitigations,
  'adr': connectAdrRelationships,
  'security-enclave': connectEnclaveRelationships,
};

export function connectArtifactRelationships(
  scannedMap: Map<string, ScannedArtifact>,
  nodeMap: Map<string, CytoscapeNodeData>,
  addEdge: (e: CytoscapeEdgeData) => void
): void {
  for (const art of scannedMap.values()) {
    const handler = CONNECTOR_MAP[art.type];
    if (handler) handler(art, nodeMap, addEdge);
  }
}

function updateTracesForEdge(e: CytoscapeEdgeData, nodeMap: Map<string, CytoscapeNodeData>): void {
  const srcNode = nodeMap.get(e.source);
  const tgtNode = nodeMap.get(e.target);
  if (!srcNode || !tgtNode) return;
  srcNode.downstream = srcNode.downstream || [];
  if (!srcNode.downstream.includes(e.target)) srcNode.downstream.push(e.target);
  tgtNode.upstream = tgtNode.upstream || [];
  if (!tgtNode.upstream.includes(e.source)) tgtNode.upstream.push(e.source);
}

function buildNodeElements(
  nodeMap: Map<string, CytoscapeNodeData>,
  nodesByLayer: Record<GraphNodeLayer, number>
): { elements: CytoscapeElement[]; conformingCount: number; issueCount: number } {
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
    elements.push({ group: 'nodes', data: n, classes: `layer-${n.layer} type-${n.type} status-${n.status.toLowerCase()}` });
  }

  return { elements, conformingCount, issueCount };
}

function buildEdgeElements(
  edges: CytoscapeEdgeData[],
  nodeMap: Map<string, CytoscapeNodeData>
): CytoscapeElement[] {
  return edges
    .filter((e) => nodeMap.has(e.source) && nodeMap.has(e.target))
    .map((e) => ({
      group: 'edges',
      data: e,
      classes: `relation-${e.relation} status-${e.status?.toLowerCase() || 'compliant'}`,
    }));
}

export function assembleGraphElementsResult(
  nodeMap: Map<string, CytoscapeNodeData>,
  edges: CytoscapeEdgeData[],
  driftTargets: Set<string>
): GraphElementsResult {
  for (const [id, node] of nodeMap.entries()) {
    if (driftTargets.has(id)) node.status = 'DRIFT';
  }
  const validEdges = edges.filter((e) => nodeMap.has(e.source) && nodeMap.has(e.target));
  for (const e of validEdges) {
    updateTracesForEdge(e, nodeMap);
  }

  const nodesByLayer: Record<GraphNodeLayer, number> = { product: 0, requirement: 0, architecture: 0, test: 0 };
  const { elements: nodeElements, conformingCount, issueCount } = buildNodeElements(nodeMap, nodesByLayer);
  const edgeElements = buildEdgeElements(validEdges, nodeMap);

  return {
    elements: [...nodeElements, ...edgeElements],
    nodesByLayer,
    conformingCount,
    issueCount,
  };
}

/**
 * Builds the graph elements (nodes & edges) for Cytoscape.js.
 */
export function buildGraphElements(rootDir: string = process.cwd()): GraphElementsResult {
  const pdac = verifyPdacGraph({ rootDir });
  const trace = verifyTraceability({ rootDir });

  const nodeMap = new Map<string, CytoscapeNodeData>();
  const edges: CytoscapeEdgeData[] = [];
  const edgeKeySet = new Set<string>();
  const driftTargets = new Set(pdac.drifts.map((d) => d.targetId));

  const addEdge = (e: CytoscapeEdgeData) => {
    const key = `${e.source}->${e.target}:${e.relation}`;
    if (!edgeKeySet.has(key)) {
      edgeKeySet.add(key);
      edges.push(e);
    }
  };

  const { scannedArtifactsMap, archViewByBasename } = scanWorkspaceArtifacts(rootDir);
  processTraceabilityRequirements(trace.rows, archViewByBasename, rootDir, nodeMap, addEdge);
  registerScannedArtifactNodes(scannedArtifactsMap, nodeMap);
  connectArtifactRelationships(scannedArtifactsMap, nodeMap, addEdge);

  return assembleGraphElementsResult(nodeMap, edges, driftTargets);
}
