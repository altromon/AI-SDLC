/**
 * AI-SDLC: SDD Change Integration & Canonical Specification Promotion Engine
 * Ensures that changes implemented in SDD workspaces are correctly integrated
 * into canonical specifications (Product, Requirements, and Architecture arc42/NAF v4).
 */

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import {
  ChangeDetectionOptions,
  ChangeDetectionResult,
  ProductHandoff,
  SddIntegrationAudit,
  SddIntegrationOptions,
  SddIntegrationResult,
} from '../../types/index.js';
import { walkMdFiles } from '../../utils/fs.js';
import { parseFrontmatter } from '../../verifiers/traceability.js';
import { loadProductHandoffSidecar } from './index.js';

interface TaskParsed {
  id: string;
  title?: string;
  status?: string;
}

function parseFrontmatterTasks(frontmatter: Record<string, unknown> | null): TaskParsed[] {
  if (!frontmatter || !Array.isArray(frontmatter.tasks)) return [];
  const tasks: TaskParsed[] = [];
  for (const t of frontmatter.tasks as Record<string, unknown>[]) {
    if (t && typeof t === 'object' && t.id) {
      tasks.push({
        id: String(t.id),
        title: t.title ? String(t.title) : undefined,
        status: t.status ? String(t.status).toUpperCase() : undefined,
      });
    }
  }
  return tasks;
}

function parseMarkdownCheckboxTasks(content: string): TaskParsed[] {
  const tasks: TaskParsed[] = [];
  const lines = content.split('\n');
  let index = 1;
  for (const line of lines) {
    const match = line.trim().match(/^-\s+\[([ xX])\]\s+(?:`([^`]+)`\s*:?\s*)?(.*)$/);
    if (match) {
      const isDone = match[1].toLowerCase() === 'x';
      const taskId = match[2] || `TSK-${String(index).padStart(3, '0')}`;
      tasks.push({
        id: taskId,
        title: match[3],
        status: isDone ? 'COMPLETED' : 'PENDING',
      });
      index++;
    }
  }
  return tasks;
}

export function parseTasksFromContent(content: string): TaskParsed[] {
  const { frontmatter } = parseFrontmatter(content);
  const tasks = parseFrontmatterTasks(frontmatter);
  return tasks.length > 0 ? tasks : parseMarkdownCheckboxTasks(content);
}

export function appendRevisionHistoryRow(
  body: string,
  entry: { version: string; date: string; author: string; description: string; reference: string }
): string {
  if (body.includes(entry.reference)) return body;

  const tableHeaderMatch = body.match(
    /(\|\s*Versi[oó]n\s*\|\s*Fecha\s*\|\s*Autor[^\n]*\r?\n\|[\s\-:|]+\r?\n)/i
  );
  const newRow = `| **${entry.version}** | ${entry.date} | ${entry.author} | ${entry.description} | ${entry.reference} |\n`;

  if (tableHeaderMatch && tableHeaderMatch.index !== undefined) {
    const insertPos = tableHeaderMatch.index + tableHeaderMatch[0].length;
    return body.substring(0, insertPos) + newRow + body.substring(insertPos);
  }

  const newSection = `\n\n## Historial de Revisiones\n\n| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |\n| :--- | :--- | :--- | :--- | :--- |\n${newRow}`;
  return body + newSection;
}

// --- Canonical Artifact Materialization ---

interface SpecCatalogNewItem {
  id: string;
  targetDir: string;
  category: string;
  scope: string;
}

interface SpecCatalogAffectedItem {
  id: string;
  action: 'MODIFIED' | 'DEPRECATED';
  category: string;
}

export interface SpecCatalogScope {
  newItems: SpecCatalogNewItem[];
  affectedItems: SpecCatalogAffectedItem[];
}

function parseAffectedCatalogItems(block?: string): SpecCatalogAffectedItem[] {
  if (!block) return [];
  const items: SpecCatalogAffectedItem[] = [];
  const rows = block.split('\n').filter((l) => l.trim().startsWith('|'));
  for (const row of rows) {
    if (/^\|\s*:?-+:?\s*\|/.test(row) || /Catalog Category/.test(row)) continue;
    const cols = row.split('|').map((c) => c.trim()).filter(Boolean);
    if (cols.length < 3) continue;
    const rawId = cols[1].replace(/`/g, '').trim();
    const rawAction = cols[2].replace(/`/g, '').trim().toUpperCase();
    if (rawId && (rawAction === 'MODIFIED' || rawAction === 'DEPRECATED')) {
      items.push({ id: rawId, action: rawAction as 'MODIFIED' | 'DEPRECATED', category: cols[0] });
    }
  }
  return items;
}

function parseNewCatalogItems(block?: string): SpecCatalogNewItem[] {
  if (!block) return [];
  const items: SpecCatalogNewItem[] = [];
  const rows = block.split('\n').filter((l) => l.trim().startsWith('|'));
  for (const row of rows) {
    if (/^\|\s*:?-+:?\s*\|/.test(row) || /Catalog Category/.test(row)) continue;
    const cols = row.split('|').map((c) => c.trim()).filter(Boolean);
    if (cols.length < 3) continue;
    const rawId = cols[1].replace(/`/g, '').trim();
    const rawDir = cols[2].replace(/`/g, '').trim();
    if (rawId && rawDir) {
      items.push({ id: rawId, targetDir: rawDir, category: cols[0], scope: cols[3] || '' });
    }
  }
  return items;
}

export function parseSpecCatalogScope(specContent: string): SpecCatalogScope {
  const s11 = specContent.match(/###\s+1\.1\s+Affected Existing Catalog Items[^\n]*\n([\s\S]*?)(?=\n###\s+1\.2|\n---|\n##\s|$)/i);
  const s12 = specContent.match(/###\s+1\.2\s+New Catalog Items Introduced[^\n]*\n([\s\S]*?)(?=\n---|\n##\s|\n###\s+[^1]|$)/i);

  return {
    affectedItems: parseAffectedCatalogItems(s11 ? s11[1] : undefined),
    newItems: parseNewCatalogItems(s12 ? s12[1] : undefined),
  };
}

const CANONICAL_TYPE_MAP: Record<string, string> = {
  'product/requirements/': 'requirement',
  'product/use-cases/': 'use-case',
  'product/actors/': 'actor',
  'product/business-rules/': 'business-rule',
  'product/journeys/': 'journey',
  'security/requirements/': 'security-requirement',
  'privacy/requirements/': 'privacy-requirement',
  'specs/privacy/requirements/': 'privacy-requirement',
  'privacy/assets/': 'data-asset',
  'privacy/data-assets/': 'data-asset',
  'specs/privacy/assets/': 'data-asset',
  'specs/privacy/data-assets/': 'data-asset',
  'privacy/ropa/': 'privacy-ropa',
  'specs/privacy/ropa/': 'privacy-ropa',
  'privacy/dpia/': 'dpia-request',
  'specs/privacy/dpia/': 'dpia-request',
  'architecture/': 'component',
};

const ID_PREFIX_TYPE_PAIRS: ReadonlyArray< readonly [string, string]> = [
  ['PRIV-REQ-', 'privacy-requirement'],
  ['DATA-ASSET-', 'data-asset'],
  ['PRIV-ROPA-', 'privacy-ropa'],
  ['DPIA-', 'dpia-request'],
  ['SEC-REQ-', 'security-requirement'],
  ['FR-', 'requirement'],
  ['QR-', 'requirement'],
  ['CON-', 'requirement'],
  ['UC-', 'use-case'],
  ['ACT-', 'actor'],
  ['BR-', 'business-rule'],
  ['CMP-', 'component'],
];

function resolveCanonicalArtifactType(normTarget: string, id: string): string {
  if (CANONICAL_TYPE_MAP[normTarget]) return CANONICAL_TYPE_MAP[normTarget];
  const matched = ID_PREFIX_TYPE_PAIRS.find(([prefix]) => id.startsWith(prefix));
  return matched ? matched[1] : 'artifact';
}

function buildCanonicalInitialContent(item: SpecCatalogNewItem, changeId: string, author: string, date: string): string {
  const normTarget = item.targetDir.endsWith('/') ? item.targetDir : `${item.targetDir}/`;
  const artifactType = resolveCanonicalArtifactType(normTarget, item.id);
  const frontmatter = `id: ${item.id}\ntype: ${artifactType}\nstatus: draft\nversion: "1.0.0"\n`;
  const title = item.scope || item.id;
  const revisionRow = `| **1.0.0** | ${date} | ${author} | Creación inicial desde ${changeId} | ${changeId} |\n`;
  const body = `# ${item.id}: ${title}\n\n## Historial de Revisiones\n\n| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |\n| :--- | :--- | :--- | :--- | :--- |\n${revisionRow}`;
  return `---\n${frontmatter}---\n${body}`;
}

function materializeCanonicalArtifact(
  rootDir: string,
  item: SpecCatalogNewItem,
  changeId: string,
  author: string,
  date: string
): string {
  const targetPath = path.join(rootDir, item.targetDir, `${item.id}.md`);
  if (fs.existsSync(targetPath)) return targetPath;

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const initialContent = buildCanonicalInitialContent(item, changeId, author, date);
  fs.writeFileSync(targetPath, initialContent, 'utf-8');
  return targetPath;
}

export function findChangeWorkspaceDir(rootDir: string, changeId: string): string | null {
  const activeDir = path.join(rootDir, 'specs', 'changes', 'active', changeId);
  if (fs.existsSync(activeDir)) return activeDir;

  const completedDir = path.join(rootDir, 'specs', 'changes', 'completed', changeId);
  if (fs.existsSync(completedDir)) return completedDir;

  const openspecActive = path.join(rootDir, 'openspec', 'changes', changeId);
  if (fs.existsSync(openspecActive)) return openspecActive;

  return null;
}

function checkTasksExecution(changeDir: string, changeId: string) {
  const tasksFile = path.join(changeDir, 'tasks.md');
  const allTasks: TaskParsed[] = [];
  if (fs.existsSync(tasksFile)) {
    allTasks.push(...parseTasksFromContent(fs.readFileSync(tasksFile, 'utf-8')));
  }
  const completedTasks = allTasks.filter((t) => t.status === 'COMPLETED').map((t) => t.id);
  const pendingTasks = allTasks.filter((t) => t.status !== 'COMPLETED').map((t) => t.id);

  if (pendingTasks.length > 0) {
    return {
      ok: false,
      completedTasks,
      pendingTasks,
      error: `No se puede integrar el cambio '${changeId}' porque existen ${pendingTasks.length} tareas pendientes o bloqueadas (${pendingTasks.join(', ')}). Todas las tareas deben estar en COMPLETED.`,
    };
  }
  return { ok: true, completedTasks, pendingTasks, error: null };
}

function isProposalRequirementId(id: string): boolean {
  return id.startsWith('FR-') || id.startsWith('QR-') || id.startsWith('CON-') || id.startsWith('SEC-REQ-');
}

function buildSubgraphFromProposalIds(ids: string[]): ProductHandoff['subgraph'] {
  const reqs = ids.filter(isProposalRequirementId);
  const privReqs = ids.filter((id) => id.startsWith('PRIV-REQ-'));
  const dataAssets = ids.filter((id) => id.startsWith('DATA-ASSET-'));
  const ropaEntries = ids.filter((id) => id.startsWith('PRIV-ROPA-'));
  return {
    requirements: reqs,
    ...(privReqs.length > 0 ? { privacyRequirements: privReqs } : {}),
    ...(dataAssets.length > 0 ? { dataAssets } : {}),
    ...(ropaEntries.length > 0 ? { ropaEntries } : {}),
  };
}

function resolveChangeHandoff(changeDir: string, changeId: string): ProductHandoff | null {
  const sidecar = loadProductHandoffSidecar(changeDir);
  if (sidecar) return sidecar;

  const proposalFile = path.join(changeDir, 'proposal.md');
  if (!fs.existsSync(proposalFile)) return null;

  const propContent = fs.readFileSync(proposalFile, 'utf-8');
  const { frontmatter } = parseFrontmatter(propContent);
  const citations = Array.isArray(frontmatter.citations) ? (frontmatter.citations as NonNullable<ProductHandoff['citations']>) : [];
  const ids = citations.map((c) => c.id || '').filter(Boolean);

  return {
    id: `HOF-${changeId.toUpperCase()}`,
    type: 'handoff',
    changeId,
    subgraph: buildSubgraphFromProposalIds(ids),
    citations,
  };
}

function materializeNewCatalogArtifacts(changeDir: string, rootDir: string, changeId: string, author: string, date: string, errors: string[]) {
  const created: string[] = [];
  const specFile = path.join(changeDir, 'spec.md');
  if (!fs.existsSync(specFile)) return created;

  const specContent = fs.readFileSync(specFile, 'utf-8');
  const { newItems } = parseSpecCatalogScope(specContent);
  for (const item of newItems) {
    try {
      materializeCanonicalArtifact(rootDir, item, changeId, author, date);
      created.push(item.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Error materializando artefacto canónico '${item.id}': ${msg}`);
    }
  }
  return created;
}

type CanonicalMap = Map<string, { file: string; frontmatter: Record<string, unknown>; body: string }>;

function loadCanonicalArtifacts(rootDir: string): CanonicalMap {
  const allMdFiles = walkMdFiles(rootDir);
  const canonicalArtifacts: CanonicalMap = new Map();
  for (const file of allMdFiles) {
    const relFile = path.relative(rootDir, file).replace(/\\/g, '/');
    if (relFile.includes('specs/changes/') || relFile.includes('templates/')) continue;
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const { frontmatter, body } = parseFrontmatter(content);
      if (frontmatter.id) canonicalArtifacts.set(String(frontmatter.id), { file, frontmatter, body });
    } catch {}
  }
  return canonicalArtifacts;
}

function writeUpdatedArtifact(file: string, frontmatter: Record<string, unknown>, body: string): void {
  const yamlHeader = `---\n${yaml.dump(frontmatter, { indent: 2, lineWidth: -1 }).trim()}\n---\n`;
  fs.writeFileSync(file, yamlHeader + body, 'utf-8');
}

function updateSingleCanonicalRequirement(
  canonical: { file: string; frontmatter: Record<string, unknown>; body: string },
  completedTasks: string[],
  changeId: string,
  date: string,
  author: string
): boolean {
  const fm = canonical.frontmatter;
  const isPending = fm.status !== 'active';
  if (isPending) fm.status = 'active';

  const taskDesc = completedTasks.length > 0 ? `Implementación verificada (${completedTasks.join(', ')})` : `Integración de especificación`;
  const updatedBody = appendRevisionHistoryRow(canonical.body, {
    version: String(fm.version || '1.0.0'),
    date,
    author,
    description: taskDesc,
    reference: changeId,
  });

  if (updatedBody !== canonical.body || isPending) {
    writeUpdatedArtifact(canonical.file, fm, updatedBody);
    return true;
  }
  return false;
}

function tryUpdateCanonicalRequirement(
  canonical: { file: string; frontmatter: Record<string, unknown>; body: string },
  reqId: string,
  completedTasks: string[],
  changeId: string,
  date: string,
  author: string,
  errors: string[]
): boolean {
  try {
    return updateSingleCanonicalRequirement(canonical, completedTasks, changeId, date, author);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Error actualizando artefacto canónico '${reqId}': ${msg}`);
    return false;
  }
}

function updateRequirementsArtifacts(
  targetReqs: string[],
  createdArtifacts: string[],
  canonicalArtifacts: CanonicalMap,
  completedTasks: string[],
  changeId: string,
  date: string,
  author: string,
  errors: string[]
): string[] {
  const updated: string[] = [];
  for (const reqId of targetReqs) {
    if (createdArtifacts.includes(reqId)) continue;
    const canonical = canonicalArtifacts.get(reqId);
    if (canonical && tryUpdateCanonicalRequirement(canonical, reqId, completedTasks, changeId, date, author, errors)) {
      updated.push(reqId);
    }
  }
  return updated;
}

function isArchitectureComponentId(id?: string): boolean {
  if (!id) return false;
  return id.startsWith('CMP-') || id.startsWith('SEC-ENC-') || id.startsWith('ADR-');
}

function collectCitedComponents(citations?: ProductHandoff['citations']): string[] {
  if (!citations) return [];
  const cited: string[] = [];
  for (const c of citations) {
    const citeId = c.targetId || c.id;
    if (isArchitectureComponentId(citeId)) cited.push(citeId!);
  }
  return cited;
}

function collectSatisfyingComponents(canonicalArtifacts: CanonicalMap, targetReqs: string[], cited: string[]): void {
  for (const [artId, art] of canonicalArtifacts.entries()) {
    if (!artId.startsWith('CMP-') || !art.frontmatter) continue;
    const satisfies = Array.isArray(art.frontmatter['satisfies-requirements'])
      ? (art.frontmatter['satisfies-requirements'] as string[])
      : [];
    if (targetReqs.some((r) => satisfies.includes(r)) && !cited.includes(artId)) {
      cited.push(artId);
    }
  }
}

function collectArchitectureComponents(handoff: ProductHandoff, canonicalArtifacts: CanonicalMap, targetReqs: string[]): string[] {
  const cited = collectCitedComponents(handoff.citations);
  collectSatisfyingComponents(canonicalArtifacts, targetReqs, cited);
  return cited;
}

function isSatisfiableRequirementId(id: string): boolean {
  return (
    id.startsWith('FR-') ||
    id.startsWith('QR-') ||
    id.startsWith('CON-') ||
    id.startsWith('SEC-REQ-') ||
    id.startsWith('PRIV-REQ-')
  );
}

function mergeSatisfiesRequirements(fm: Record<string, unknown>, targetReqs: string[]): boolean {
  const existing = Array.isArray(fm['satisfies-requirements']) ? [...fm['satisfies-requirements']] : [];
  let modified = false;
  for (const req of targetReqs) {
    if (!isSatisfiableRequirementId(req)) continue;
    if (!existing.includes(req)) {
      existing.push(req);
      modified = true;
    }
  }
  fm['satisfies-requirements'] = existing;
  return modified;
}

function updateSingleArchitectureComponent(
  canonical: { file: string; frontmatter: Record<string, unknown>; body: string },
  cmpId: string,
  targetReqs: string[],
  changeId: string,
  date: string,
  author: string
): boolean {
  const fm = canonical.frontmatter;
  const modified = cmpId.startsWith('CMP-') ? mergeSatisfiesRequirements(fm, targetReqs) : false;
  const updatedBody = appendRevisionHistoryRow(canonical.body, {
    version: String(fm.version || '1.0.0'),
    date,
    author,
    description: `Integración de incremento de entrega ${changeId}`,
    reference: changeId,
  });
  if (updatedBody !== canonical.body || modified) {
    writeUpdatedArtifact(canonical.file, fm, updatedBody);
    return true;
  }
  return false;
}

function updateArchitectureComponents(
  citedComponents: string[],
  canonicalArtifacts: CanonicalMap,
  targetReqs: string[],
  changeId: string,
  date: string,
  author: string,
  errors: string[]
): string[] {
  const updated: string[] = [];
  for (const cmpId of citedComponents) {
    const canonical = canonicalArtifacts.get(cmpId);
    if (!canonical) continue;
    try {
      if (updateSingleArchitectureComponent(canonical, cmpId, targetReqs, changeId, date, author)) {
        updated.push(cmpId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Error actualizando componente de arquitectura '${cmpId}': ${msg}`);
    }
  }
  return updated;
}

function moveToCompletedFolder(changeDir: string, changeId: string, rootDir: string): string {
  const completedParent = path.join(rootDir, 'specs', 'changes', 'completed');
  if (!fs.existsSync(completedParent)) fs.mkdirSync(completedParent, { recursive: true });
  const destDir = path.join(completedParent, changeId);
  if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true, force: true });
  fs.renameSync(changeDir, destDir);

  const destProposal = path.join(destDir, 'proposal.md');
  if (fs.existsSync(destProposal)) {
    const { frontmatter, body } = parseFrontmatter(fs.readFileSync(destProposal, 'utf-8'));
    frontmatter.status = 'applied';
    writeUpdatedArtifact(destProposal, frontmatter, body);
  }
  return destDir;
}

function archiveChangeWorkspace(
  changeDir: string,
  changeId: string,
  rootDir: string,
  autoArchive: boolean,
  completedAll: boolean
): { archived: boolean; archivedPath?: string } {
  const isActiveFolder = changeDir.includes('specs' + path.sep + 'changes' + path.sep + 'active');
  if (completedAll && autoArchive && isActiveFolder) {
    const destDir = moveToCompletedFolder(changeDir, changeId, rootDir);
    return { archived: true, archivedPath: destDir };
  }

  const proposalFile = path.join(changeDir, 'proposal.md');
  if (fs.existsSync(proposalFile)) {
    const { frontmatter, body } = parseFrontmatter(fs.readFileSync(proposalFile, 'utf-8'));
    if (completedAll) frontmatter.status = 'completed';
    writeUpdatedArtifact(proposalFile, frontmatter, body);
  }
  return { archived: false };
}

function buildEmptyIntegrationResult(changeId: string, error: string, pendingTasks: string[] = []): SddIntegrationResult {
  return {
    success: false,
    changeId,
    completedTasks: [],
    pendingTasks,
    integratedRequirements: [],
    updatedProductArtifacts: [],
    updatedArchitectureArtifacts: [],
    archived: false,
    errors: [error],
  };
}

function validateChangeWorkspace(rootDir: string, changeId: string) {
  const changeDir = findChangeWorkspaceDir(rootDir, changeId);
  if (!changeDir) {
    return { error: `No se encontró el espacio de trabajo para el cambio '${changeId}'.` };
  }
  const tasksRes = checkTasksExecution(changeDir, changeId);
  if (!tasksRes.ok) {
    return { error: tasksRes.error!, pendingTasks: tasksRes.pendingTasks };
  }
  const handoff = resolveChangeHandoff(changeDir, changeId);
  if (!handoff || !handoff.subgraph) {
    return { error: `El cambio '${changeId}' no posee un sidecar 'handoff.yaml' ni citaciones válidas en proposal.md.` };
  }
  return { changeDir, tasksRes, handoff };
}

function buildIntegrationSuccessPayload(
  changeId: string,
  tasksRes: { completedTasks: string[]; pendingTasks: string[] },
  targetReqs: string[],
  updatedProduct: string[],
  updatedArch: string[],
  createdArtifacts: string[],
  archiveRes: { archived: boolean; archivedPath?: string },
  errors: string[]
): SddIntegrationResult {
  return {
    success: errors.length === 0,
    changeId,
    completedTasks: tasksRes.completedTasks,
    pendingTasks: tasksRes.pendingTasks,
    integratedRequirements: targetReqs,
    updatedProductArtifacts: updatedProduct,
    updatedArchitectureArtifacts: updatedArch,
    createdCanonicalArtifacts: createdArtifacts,
    archived: archiveRes.archived,
    archivedPath: archiveRes.archivedPath,
    errors,
  };
}

function collectSubgraphPromotableIds(subgraph?: ProductHandoff['subgraph']): string[] {
  if (!subgraph) return [];
  const rawSub = subgraph as Record<string, unknown>;
  const ropaAlias = Array.isArray(rawSub.ropaEntries) ? (rawSub.ropaEntries as string[]) : [];
  const privacyRopa = Array.isArray(rawSub.privacyRopa) ? (rawSub.privacyRopa as string[]) : [];
  const combined = [
    ...(subgraph.requirements || []),
    ...(subgraph.securityRequirements || []),
    ...(subgraph.privacyRequirements || []),
    ...(subgraph.dataAssets || []),
    ...ropaAlias,
    ...privacyRopa,
  ];
  return Array.from(new Set(combined));
}

function collectSpecAffectedNonArchIds(changeDir: string): string[] {
  const specFile = path.join(changeDir, 'spec.md');
  if (!fs.existsSync(specFile)) return [];
  const { affectedItems } = parseSpecCatalogScope(fs.readFileSync(specFile, 'utf-8'));
  return affectedItems
    .map((item) => item.id)
    .filter((id) => !isArchitectureComponentId(id));
}

interface ExecutionContext {
  rootDir: string;
  changeId: string;
  author: string;
  date: string;
}

function resolveIntegrationOptions(options: SddIntegrationOptions): ExecutionContext {
  return {
    rootDir: options.rootDir || process.cwd(),
    changeId: options.changeId,
    author: options.author || 'AI-SDLC Integration Engine',
    date: options.date || new Date().toISOString().split('T')[0],
  };
}

function resolveTargetRequirements(handoff: ProductHandoff, changeDir: string): string[] {
  return Array.from(
    new Set([
      ...collectSubgraphPromotableIds(handoff.subgraph),
      ...collectSpecAffectedNonArchIds(changeDir),
    ])
  );
}

function applyArtifactUpdates(
  ctx: ExecutionContext,
  changeDir: string,
  handoff: ProductHandoff,
  completedTasks: string[],
  errors: string[]
): {
  targetReqs: string[];
  updatedProduct: string[];
  updatedArch: string[];
  createdArtifacts: string[];
} {
  const targetReqs = resolveTargetRequirements(handoff, changeDir);
  const createdArtifacts = materializeNewCatalogArtifacts(changeDir, ctx.rootDir, ctx.changeId, ctx.author, ctx.date, errors);
  const canonicalArtifacts = loadCanonicalArtifacts(ctx.rootDir);

  const updatedProduct = updateRequirementsArtifacts(targetReqs, createdArtifacts, canonicalArtifacts, completedTasks, ctx.changeId, ctx.date, ctx.author, errors);
  const citedComponents = collectArchitectureComponents(handoff, canonicalArtifacts, targetReqs);
  const updatedArch = updateArchitectureComponents(citedComponents, canonicalArtifacts, targetReqs, ctx.changeId, ctx.date, ctx.author, errors);

  return { targetReqs, updatedProduct, updatedArch, createdArtifacts };
}

export function integrateSddChange(options: SddIntegrationOptions): SddIntegrationResult {
  const ctx = resolveIntegrationOptions(options);
  const validation = validateChangeWorkspace(ctx.rootDir, ctx.changeId);
  if (validation.error) return buildEmptyIntegrationResult(ctx.changeId, validation.error, validation.pendingTasks);

  const errors: string[] = [];
  const { changeDir, tasksRes, handoff } = validation;
  const updates = applyArtifactUpdates(ctx, changeDir!, handoff!, tasksRes!.completedTasks, errors);
  const completedAll = tasksRes!.completedTasks.length > 0 && tasksRes!.pendingTasks.length === 0;
  const archiveRes = archiveChangeWorkspace(changeDir!, ctx.changeId, ctx.rootDir, options.autoArchive !== false, completedAll);

  return buildIntegrationSuccessPayload(
    ctx.changeId,
    tasksRes!,
    updates.targetReqs,
    updates.updatedProduct,
    updates.updatedArch,
    updates.createdArtifacts,
    archiveRes,
    errors
  );
}

function auditChangeRequirements(targetReqs: string[], canonicalMap: CanonicalMap): { integrated: string[]; missing: string[]; gaps: string[] } {
  const integrated: string[] = [];
  const missing: string[] = [];
  const gaps: string[] = [];

  for (const reqId of targetReqs) {
    const canonical = canonicalMap.get(reqId);
    if (!canonical) {
      missing.push(reqId);
      gaps.push(`El requerimiento '${reqId}' no existe en la especificación canónica.`);
    } else {
      if (canonical.frontmatter.status !== 'active') {
        gaps.push(`El requerimiento '${reqId}' no tiene status: active en la especificación canónica.`);
      }
      integrated.push(reqId);
    }
  }
  return { integrated, missing, gaps };
}

function resolveAuditStatus(integratedCount: number, targetCount: number, gapsCount: number): 'FULLY_INTEGRATED' | 'PARTIALLY_INTEGRATED' | 'UNINTEGRATED' {
  if (integratedCount === targetCount && gapsCount === 0) return 'FULLY_INTEGRATED';
  if (integratedCount > 0) return 'PARTIALLY_INTEGRATED';
  return 'UNINTEGRATED';
}

function auditChangeEntry(changeDir: string, changeName: string, canonicalMap: CanonicalMap): SddIntegrationAudit | null {
  const handoff = loadProductHandoffSidecar(changeDir);
  if (!handoff) return null;

  const tasksFile = path.join(changeDir, 'tasks.md');
  const tasks = fs.existsSync(tasksFile) ? parseTasksFromContent(fs.readFileSync(tasksFile, 'utf-8')) : [];
  const completed = tasks.filter((t) => t.status === 'COMPLETED');
  const targetReqs = collectSubgraphPromotableIds(handoff.subgraph);

  const { integrated, missing, gaps } = auditChangeRequirements(targetReqs, canonicalMap);
  const status = resolveAuditStatus(integrated.length, targetReqs.length, gaps.length);

  return {
    changeId: changeName,
    status,
    completedTasksCount: completed.length,
    totalTasksCount: tasks.length,
    integratedRequirements: integrated,
    missingRequirements: missing,
    gaps,
  };
}

function collectParentDirAudits(parent: string, canonicalMap: CanonicalMap, audits: SddIntegrationAudit[], errors: string[]): void {
  if (!fs.existsSync(parent)) return;
  const entries = fs.readdirSync(parent, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const audit = auditChangeEntry(path.join(parent, e.name), e.name, canonicalMap);
    if (audit) {
      if (audit.gaps.length > 0) errors.push(`[${e.name}] Desalineación: ${audit.gaps.join('; ')}`);
      audits.push(audit);
    }
  }
}

export function verifySddIntegration(options: { rootDir?: string } = {}): {
  success: boolean;
  audits: SddIntegrationAudit[];
  errors: string[];
} {
  const rootDir = options.rootDir || process.cwd();
  const audits: SddIntegrationAudit[] = [];
  const errors: string[] = [];

  const searchDirs = [
    path.join(rootDir, 'specs', 'changes', 'completed'),
    path.join(rootDir, 'specs', 'changes', 'active'),
  ];
  const canonicalMap = loadCanonicalArtifacts(rootDir);

  for (const parent of searchDirs) {
    collectParentDirAudits(parent, canonicalMap, audits, errors);
  }

  return { success: errors.length === 0, audits, errors };
}

function matchesFolderOrPrefix(folder: string, candidate: string): boolean {
  const fLower = folder.toLowerCase();
  const cLower = candidate.toLowerCase();
  if (fLower === cLower || cLower.includes(fLower)) return true;
  const fPrefix = fLower.match(/^([a-z0-9]+-[0-9]+)/);
  const cPrefix = cLower.match(/([a-z0-9]+-[0-9]+)/);
  return Boolean(fPrefix && cPrefix && fPrefix[1] === cPrefix[1]);
}

function matchByChangedFiles(activeFolders: string[], files?: string[]) {
  if (!files || files.length === 0) return null;
  for (const file of files) {
    const match = file.replace(/\\/g, '/').match(/specs\/changes\/active\/([^/]+)/);
    if (match && activeFolders.includes(match[1])) {
      return { changeId: match[1], source: 'files' as const, reason: `Coincidencia por archivo modificado '${file}'.` };
    }
  }
  return null;
}

function matchByText(activeFolders: string[], text: string | undefined, source: 'branch' | 'title' | 'body', reasonPrefix: string) {
  if (!text) return null;
  const found = activeFolders.find((f) => matchesFolderOrPrefix(f, text));
  if (found) return { changeId: found, source, reason: `${reasonPrefix} '${text}'.` };
  return null;
}

function resolveMatchFromMetadata(
  activeFolders: string[],
  options: ChangeDetectionOptions
): { changeId?: string; source?: ChangeDetectionResult['source']; reason?: string } {
  const branchMatch = matchByText(activeFolders, options.headRef, 'branch', 'Coincidencia por rama origen');
  if (branchMatch) return branchMatch;

  const fileMatch = matchByChangedFiles(activeFolders, options.changedFiles);
  if (fileMatch) return fileMatch;

  const titleMatch = matchByText(activeFolders, options.prTitle, 'title', 'Coincidencia por título del PR');
  if (titleMatch) return titleMatch;

  const bodyMatch = matchByText(activeFolders, options.prBody, 'body', 'Coincidencia por mención en cuerpo del PR');
  if (bodyMatch) return bodyMatch;

  const hasFilter = Boolean(options.headRef || options.changedFiles?.length || options.prTitle || options.prBody);
  if (!hasFilter && activeFolders.length === 1) {
    return { changeId: activeFolders[0], source: 'single_active_completed', reason: `Único cambio activo disponible '${activeFolders[0]}'.` };
  }
  return {};
}

function validateActiveDirectory(activeParent: string): { ok: boolean; folders: string[]; error?: string } {
  if (!fs.existsSync(activeParent)) {
    return { ok: false, folders: [], error: `No existe el directorio de cambios activos en '${activeParent}'.` };
  }
  const entries = fs.readdirSync(activeParent, { withFileTypes: true });
  const activeFolders = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  if (activeFolders.length === 0) {
    return { ok: false, folders: [], error: 'No se encontraron carpetas de cambios activos en specs/changes/active/.' };
  }
  return { ok: true, folders: activeFolders };
}

function buildUnmatchedActiveResult(folders: string[], options: ChangeDetectionOptions): ChangeDetectionResult {
  const headRefStr = options.headRef || 'n/a';
  const prTitleStr = options.prTitle || 'n/a';
  const folderList = folders.join(', ');
  return {
    detected: false,
    reasons: [`No fue posible correlacionar unívocamente ningún cambio activo (${folderList}) a partir de la metadata proporcionada (rama: ${headRefStr}, título: ${prTitleStr}).`],
    allTasksCompleted: false,
    completedTasksCount: 0,
    totalTasksCount: 0,
  };
}

function evaluateTasksProgress(changeId: string, tasks: TaskParsed[]): { completed: TaskParsed[]; allCompleted: boolean; error?: string } {
  const completed = tasks.filter((t) => t.status === 'COMPLETED');
  const allCompleted = tasks.length > 0 && completed.length === tasks.length;
  if (tasks.length === 0) {
    return { completed, allCompleted, error: `El cambio '${changeId}' no posee tareas declaradas en tasks.md.` };
  }
  if (!allCompleted) {
    return { completed, allCompleted, error: `El cambio '${changeId}' tiene ${tasks.length - completed.length} tareas pendientes.` };
  }
  return { completed, allCompleted };
}

/**
 * Detect which active SDD change should be integrated in a CI/CD pipeline
 * upon PR merge to main or release branches.
 */
export function detectActiveChangeForIntegration(
  options: ChangeDetectionOptions = {}
): ChangeDetectionResult {
  const rootDir = options.rootDir || process.cwd();
  const activeParent = path.join(rootDir, 'specs', 'changes', 'active');
  const dirCheck = validateActiveDirectory(activeParent);

  if (!dirCheck.ok) {
    return {
      detected: false,
      reasons: [dirCheck.error!],
      allTasksCompleted: false,
      completedTasksCount: 0,
      totalTasksCount: 0,
    };
  }

  const match = resolveMatchFromMetadata(dirCheck.folders, options);
  if (!match.changeId) {
    return buildUnmatchedActiveResult(dirCheck.folders, options);
  }

  const changeDir = path.join(activeParent, match.changeId);
  const tasksFile = path.join(changeDir, 'tasks.md');
  const tasks = fs.existsSync(tasksFile) ? parseTasksFromContent(fs.readFileSync(tasksFile, 'utf-8')) : [];
  const progress = evaluateTasksProgress(match.changeId, tasks);
  const reasons: string[] = match.reason ? [match.reason] : [];
  if (progress.error) reasons.push(progress.error);

  return {
    detected: true,
    changeId: match.changeId,
    changeDir,
    source: match.source,
    allTasksCompleted: progress.allCompleted,
    completedTasksCount: progress.completed.length,
    totalTasksCount: tasks.length,
    reasons,
  };
}
