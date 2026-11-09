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
  SddIntegrateAllOptions,
  SddIntegrateAllResult,
  SddIntegrationAudit,
  SddIntegrationOptions,
  SddIntegrationResult,
} from '../../types/index.js';
import { canonicalSort, walkMdFiles } from '../../utils/fs.js';
import { extractGherkinBlock } from '../../verifiers/gherkin.js';
import { syncPdacDigests } from '../../verifiers/pdac-graph.js';
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
  const ucs = ids.filter((id) => id.startsWith('UC-'));
  const privReqs = ids.filter((id) => id.startsWith('PRIV-REQ-'));
  const dataAssets = ids.filter((id) => id.startsWith('DATA-ASSET-'));
  const ropaEntries = ids.filter((id) => id.startsWith('PRIV-ROPA-'));
  return {
    requirements: reqs,
    ...(ucs.length > 0 ? { useCases: ucs } : {}),
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

interface ChangeSpecContent {
  specBody: string;
  proposalScope: string;
  gherkinBlocks: string[];
}

function readChangeSpecContent(changeDir: string): ChangeSpecContent {
  const specFile = path.join(changeDir, 'spec.md');
  const propFile = path.join(changeDir, 'proposal.md');
  const specBody = fs.existsSync(specFile) ? parseFrontmatter(fs.readFileSync(specFile, 'utf-8')).body : '';
  const propBody = fs.existsSync(propFile) ? parseFrontmatter(fs.readFileSync(propFile, 'utf-8')).body : '';
  const scopeMatch = propBody.match(/##\s+1\.\s+(?:Motivaci[oó]n|Motivation)[^\n]*\r?\n([\s\S]*?)(?=\r?\n##\s+2\.|\r?\n---|\s*$)/i);
  const proposalScope = scopeMatch ? scopeMatch[1].trim() : '';
  return { specBody, proposalScope, gherkinBlocks: extractGherkinBlock(specBody) };
}

function isBoilerplateNormativeStatement(text: string): boolean {
  const norm = text.trim();
  if (!norm || norm.length < 15) return true;
  return (
    /^El sistema DEBE implementar y soportar la capacidad de [^\n.]+\.?$/i.test(norm) ||
    /^Definici[oó]n de artefacto citado en [^\n.]+\.?$/i.test(norm) ||
    /^The system MUST \[unambiguous/i.test(norm)
  );
}

function isBoilerplateGherkin(block: string): boolean {
  return (
    block.includes('When the operation for "') &&
    (block.includes('Given the system is in an operational state') ||
      block.includes('Given the system is in a nominal operational state')) &&
    (block.includes('min_bound') || block.includes('| min   | accepted |') || block.includes('| min   | 200    |'))
  ) || (
    block.includes('Given an unauthenticated actor or invalid credentials') &&
    block.includes('When the request reaches protected enclaves')
  ) || (
    block.includes('Given the system exhibits the defect identified in "') &&
    block.includes('When the patch fix is applied')
  );
}

function extractTargetedSpecDelta(specBody: string, reqId: string): string | null {
  const escaped = reqId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const deltaRegex = new RegExp(`###\\s+\\[?[^\\]\\n]*\\b${escaped}\\b[^\\]\\n]*\\]?[^\\n]*\\r?\\n([\\s\\S]*?)(?=\\r?\\n###\\s|\\r?\\n---\\s*\\r?\\n|\\r?\\n##\\s|$)`, 'i');
  const match = specBody.match(deltaRegex);
  if (!match) return null;
  const sectionText = match[1].trim();
  const afterMatch = sectionText.match(/\*\*(?:Target Delta \(After\)|Delta Objetivo|Comportamiento Esperado):\*\*\s*([^\n]+(?:\r?\n(?!\s*\*\s*\*\*)[^\n]+)*)/i);
  if (afterMatch) return afterMatch[1].trim();
  return sectionText.length > 15 ? sectionText : null;
}

function extractBestNormativeDelta(specContent: ChangeSpecContent, reqId: string): string | null {
  const targeted = extractTargetedSpecDelta(specContent.specBody, reqId);
  if (targeted) return targeted;
  if (specContent.proposalScope.length > 40 && !/^[a-z0-9-]+$/i.test(specContent.proposalScope)) {
    return specContent.proposalScope;
  }
  return null;
}

function findDomainSpecificGherkin(nonBoilerplate: string[], reqId: string): string | undefined {
  if (reqId.startsWith('SEC-REQ-')) {
    return nonBoilerplate.find((b) => b.includes('@security') || b.includes('@mitigation'));
  }
  if (reqId.startsWith('PRIV-REQ-')) {
    return nonBoilerplate.find((b) => b.includes('@privacy'));
  }
  return undefined;
}

function selectRelevantGherkinForArtifact(
  gherkinBlocks: string[],
  reqId: string,
  totalReqsInChange: number
): string | null {
  const nonBoilerplate = gherkinBlocks.filter((b) => !isBoilerplateGherkin(b));
  if (nonBoilerplate.length === 0) return null;

  const matched = nonBoilerplate.find((b) => b.includes(`@${reqId}`)) || findDomainSpecificGherkin(nonBoilerplate, reqId);
  if (matched) return ensureBlockHasReqTag(matched, reqId);

  if (totalReqsInChange === 1 && !reqId.startsWith('SEC-REQ-') && !reqId.startsWith('PRIV-REQ-')) {
    const funcBlock = nonBoilerplate.find((b) => !b.includes('@security') && !b.includes('@privacy')) || nonBoilerplate[0];
    return ensureBlockHasReqTag(funcBlock, reqId);
  }
  return null;
}

function ensureBlockHasReqTag(block: string, reqId: string): string {
  const lines = block.trim().split(/\r?\n/);
  if (lines[0] && lines[0].trim().startsWith('@')) {
    const cleanedTags = lines[0]
      .trim()
      .split(/\s+/)
      .filter((t) => !/^@(?:CHG|PATCH)-/i.test(t));
    if (!cleanedTags.includes(`@${reqId}`)) {
      cleanedTags.unshift(`@${reqId}`);
    }
    lines[0] = cleanedTags.join(' ');
    return lines.join('\n');
  }
  return `@${reqId} @automated\n${block.trim()}`;
}

function replaceNormativeSectionIfBoilerplate(body: string, newStatement: string, changeId: string): { body: string; changed: boolean } {
  const secRegex = /(##\s+1\.\s+(?:Enunciado(?:\s+Normativo)?|Normative\s+Statement|Intenci[oó]n\s+y\s+Resultado|Intention\s+and\s+Outcome[^\n]*)\r?\n)([\s\S]*?)(?=\r?\n---|\r?\n##\s|$)/i;
  const match = body.match(secRegex);
  if (!match) return { body, changed: false };

  const currentText = match[2].trim();
  if (isBoilerplateNormativeStatement(currentText)) {
    const updated = body.replace(secRegex, `$1${newStatement}\n`);
    return { body: updated, changed: updated !== body };
  }
  if (!currentText.includes(newStatement) && !currentText.includes(changeId)) {
    const updated = body.replace(secRegex, `$1${currentText}\n\n### Incremento (${changeId})\n${newStatement}\n`);
    return { body: updated, changed: updated !== body };
  }
  return { body, changed: false };
}

function replaceGherkinBlockIfApplicable(body: string, newGherkin: string): { body: string; changed: boolean } {
  const gherkinRegex = /```gherkin\r?\n([\s\S]*?)\r?\n```/;
  const match = body.match(gherkinRegex);
  if (!match) return { body, changed: false };

  const currentBlock = match[1].trim();
  if (currentBlock === newGherkin.trim()) return { body, changed: false };

  if (isBoilerplateGherkin(currentBlock) || currentBlock !== newGherkin.trim()) {
    const updated = body.replace(gherkinRegex, `\`\`\`gherkin\n${newGherkin.trim()}\n\`\`\``);
    return { body: updated, changed: updated !== body };
  }
  return { body, changed: false };
}

function bumpMinorSemver(versionStr: string): string {
  const match = String(versionStr || '1.0.0').trim().match(/^(\d+)\.(\d+)\.(\d+)(.*)$/);
  if (!match) return '1.1.0';
  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10) + 1;
  return `${major}.${minor}.0`;
}

function syncBodyFromSpecContent(
  body: string,
  reqId: string,
  changeId: string,
  specContent: ChangeSpecContent | undefined,
  totalReqsInChange: number
): { body: string; contentSynced: boolean } {
  if (!specContent) return { body, contentSynced: false };
  let updatedBody = body;
  let contentSynced = false;

  const deltaText = extractBestNormativeDelta(specContent, reqId);
  if (deltaText) {
    const normRes = replaceNormativeSectionIfBoilerplate(updatedBody, deltaText, changeId);
    updatedBody = normRes.body;
    if (normRes.changed) contentSynced = true;
  }

  const gherkinBlock = selectRelevantGherkinForArtifact(specContent.gherkinBlocks, reqId, totalReqsInChange);
  if (gherkinBlock) {
    const gherkinRes = replaceGherkinBlockIfApplicable(updatedBody, gherkinBlock);
    updatedBody = gherkinRes.body;
    if (gherkinRes.changed) contentSynced = true;
  }

  return { body: updatedBody, contentSynced };
}

interface ReqUpdateParams {
  reqId: string;
  completedTasks: string[];
  changeId: string;
  date: string;
  author: string;
  specContent?: ChangeSpecContent;
  totalReqsInChange: number;
}

function formatTaskHistoryDescription(completedTasks: string[]): string {
  return completedTasks.length > 0
    ? `Implementación verificada (${completedTasks.join(', ')})`
    : 'Integración de especificación';
}

function promoteRequirementMetadata(
  fm: Record<string, unknown>,
  contentSynced: boolean
): boolean {
  const wasActive = fm.status === 'active';
  if (!wasActive) fm.status = 'active';
  if (contentSynced && wasActive) {
    fm.version = bumpMinorSemver(String(fm.version || '1.0.0'));
  }
  return !wasActive;
}

function updateSingleCanonicalRequirement(
  canonical: { file: string; frontmatter: Record<string, unknown>; body: string },
  params: ReqUpdateParams
): { updated: boolean; contentSynced: boolean } {
  const fm = canonical.frontmatter;
  const syncRes = syncBodyFromSpecContent(canonical.body, params.reqId, params.changeId, params.specContent, params.totalReqsInChange);
  const statusPromoted = promoteRequirementMetadata(fm, syncRes.contentSynced);
  const updatedBody = appendRevisionHistoryRow(syncRes.body, {
    version: String(fm.version || '1.0.0'),
    date: params.date,
    author: params.author,
    description: formatTaskHistoryDescription(params.completedTasks),
    reference: params.changeId,
  });
  if (updatedBody === canonical.body && !statusPromoted && !syncRes.contentSynced) {
    return { updated: false, contentSynced: false };
  }
  writeUpdatedArtifact(canonical.file, fm, updatedBody);
  return { updated: true, contentSynced: syncRes.contentSynced };
}

function tryUpdateCanonicalRequirement(
  canonical: { file: string; frontmatter: Record<string, unknown>; body: string },
  params: ReqUpdateParams,
  errors: string[]
): { updated: boolean; contentSynced: boolean } {
  try {
    return updateSingleCanonicalRequirement(canonical, params);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Error actualizando artefacto canónico '${params.reqId}': ${msg}`);
    return { updated: false, contentSynced: false };
  }
}

function buildReqUpdateParams(
  reqId: string,
  completedTasks: string[],
  ctx: ExecutionContext,
  totalReqsInChange: number,
  specContent?: ChangeSpecContent
): ReqUpdateParams {
  return { reqId, completedTasks, changeId: ctx.changeId, date: ctx.date, author: ctx.author, specContent, totalReqsInChange };
}

function updateRequirementsArtifacts(
  targetReqs: string[],
  createdArtifacts: string[],
  canonicalArtifacts: CanonicalMap,
  completedTasks: string[],
  ctx: ExecutionContext,
  errors: string[],
  specContent?: ChangeSpecContent
): { updated: string[]; syncedContent: string[] } {
  const updated: string[] = [];
  const syncedContent: string[] = [];
  const totalReqs = targetReqs.filter((id) => !id.startsWith('UC-')).length || 1;

  for (const reqId of targetReqs) {
    const canonical = !createdArtifacts.includes(reqId) ? canonicalArtifacts.get(reqId) : undefined;
    if (!canonical) continue;
    const res = tryUpdateCanonicalRequirement(canonical, buildReqUpdateParams(reqId, completedTasks, ctx, totalReqs, specContent), errors);
    if (res.updated) updated.push(reqId);
    if (res.contentSynced) syncedContent.push(reqId);
  }
  return { updated, syncedContent };
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

function collectDesignComponents(changeDir: string): string[] {
  const designFile = path.join(changeDir, 'design.md');
  if (!fs.existsSync(designFile)) return [];
  try {
    const { frontmatter } = parseFrontmatter(fs.readFileSync(designFile, 'utf-8'));
    const single = typeof frontmatter['architecture-component'] === 'string' ? [frontmatter['architecture-component']] : [];
    const multi = Array.isArray(frontmatter['architecture-components']) ? frontmatter['architecture-components'].map(String) : [];
    return [...single, ...multi].filter(isArchitectureComponentId);
  } catch {
    return [];
  }
}

function matchesComponentScope(fm: Record<string, unknown>, targetReqs: string[], targetUcs: string[]): boolean {
  const satisfies = Array.isArray(fm['satisfies-requirements']) ? (fm['satisfies-requirements'] as string[]) : [];
  const implementsUcs = Array.isArray(fm['implements-use-cases']) ? (fm['implements-use-cases'] as string[]) : [];
  return targetReqs.some((r) => satisfies.includes(r)) || targetUcs.some((u) => implementsUcs.includes(u));
}

function collectSatisfyingComponents(
  canonicalArtifacts: CanonicalMap,
  targetReqs: string[],
  targetUcs: string[],
  cited: string[]
): void {
  for (const [artId, art] of canonicalArtifacts.entries()) {
    if (!artId.startsWith('CMP-') || !art.frontmatter) continue;
    if (matchesComponentScope(art.frontmatter, targetReqs, targetUcs) && !cited.includes(artId)) {
      cited.push(artId);
    }
  }
}

function collectArchitectureComponents(
  handoff: ProductHandoff,
  canonicalArtifacts: CanonicalMap,
  targetReqs: string[],
  targetUcs: string[],
  changeDir: string
): string[] {
  const cited = collectCitedComponents(handoff.citations);
  for (const comp of collectDesignComponents(changeDir)) {
    if (!cited.includes(comp)) cited.push(comp);
  }
  collectSatisfyingComponents(canonicalArtifacts, targetReqs, targetUcs, cited);
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

function isImplementableUseCaseId(id: string): boolean {
  return id.startsWith('UC-');
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

function mergeImplementsUseCases(fm: Record<string, unknown>, targetUcs: string[]): boolean {
  const existing = Array.isArray(fm['implements-use-cases']) ? [...fm['implements-use-cases']] : [];
  let modified = false;
  for (const uc of targetUcs) {
    if (!isImplementableUseCaseId(uc)) continue;
    if (!existing.includes(uc)) {
      existing.push(uc);
      modified = true;
    }
  }
  fm['implements-use-cases'] = existing;
  return modified;
}

function syncComponentRelations(fm: Record<string, unknown>, targetReqs: string[], targetUcs: string[]): boolean {
  const reqMod = mergeSatisfiesRequirements(fm, targetReqs);
  const ucMod = mergeImplementsUseCases(fm, targetUcs);
  return reqMod || ucMod;
}

function updateSingleArchitectureComponent(
  canonical: { file: string; frontmatter: Record<string, unknown>; body: string },
  cmpId: string,
  targetReqs: string[],
  targetUcs: string[],
  changeId: string,
  date: string,
  author: string
): boolean {
  const fm = canonical.frontmatter;
  const modified = cmpId.startsWith('CMP-') ? syncComponentRelations(fm, targetReqs, targetUcs) : false;
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
  targetUcs: string[],
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
      if (updateSingleArchitectureComponent(canonical, cmpId, targetReqs, targetUcs, changeId, date, author)) {
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
  updates: {
    targetReqs: string[];
    updatedProduct: string[];
    updatedArch: string[];
    createdArtifacts: string[];
    syncedContent: string[];
  },
  archiveRes: { archived: boolean; archivedPath?: string },
  syncedDigestsCount: number,
  errors: string[]
): SddIntegrationResult {
  return {
    success: errors.length === 0,
    changeId,
    completedTasks: tasksRes.completedTasks,
    pendingTasks: tasksRes.pendingTasks,
    integratedRequirements: updates.targetReqs,
    updatedProductArtifacts: updates.updatedProduct,
    updatedArchitectureArtifacts: updates.updatedArch,
    createdCanonicalArtifacts: updates.createdArtifacts,
    syncedContentArtifacts: updates.syncedContent,
    syncedDigestsCount,
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
  syncContent: boolean;
}

function resolveIntegrationOptions(options: SddIntegrationOptions): ExecutionContext {
  return {
    rootDir: options.rootDir || process.cwd(),
    changeId: options.changeId,
    author: options.author || 'AI-SDLC Integration Engine',
    date: options.date || new Date().toISOString().split('T')[0],
    syncContent: options.syncContent !== false,
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

function collectSpecUseCases(changeDir: string): string[] {
  const specFile = path.join(changeDir, 'spec.md');
  if (!fs.existsSync(specFile)) return [];
  try {
    const { affectedItems, newItems } = parseSpecCatalogScope(fs.readFileSync(specFile, 'utf-8'));
    return [...affectedItems, ...newItems]
      .map((i) => i.id)
      .filter((id) => id && id.startsWith('UC-'));
  } catch {
    return [];
  }
}

function collectTargetUseCases(handoff: ProductHandoff, changeDir: string): string[] {
  const subUcs = (handoff.subgraph?.useCases || []).filter((uc) => uc.startsWith('UC-'));
  const citeUcs = (handoff.citations || [])
    .map((c) => c.targetId || c.id)
    .filter((id): id is string => typeof id === 'string' && id.startsWith('UC-'));
  const specUcs = collectSpecUseCases(changeDir);
  return Array.from(new Set([...subUcs, ...citeUcs, ...specUcs]));
}

function syncArchitectureArtifacts(
  handoff: ProductHandoff,
  canonicalArtifacts: CanonicalMap,
  targetReqs: string[],
  targetUcs: string[],
  changeDir: string,
  ctx: ExecutionContext,
  errors: string[]
): string[] {
  const cited = collectArchitectureComponents(handoff, canonicalArtifacts, targetReqs, targetUcs, changeDir);
  return updateArchitectureComponents(cited, canonicalArtifacts, targetReqs, targetUcs, ctx.changeId, ctx.date, ctx.author, errors);
}

interface ArtifactUpdateSummary {
  targetReqs: string[];
  updatedProduct: string[];
  updatedArch: string[];
  createdArtifacts: string[];
  syncedContent: string[];
}

function applyArtifactUpdates(
  ctx: ExecutionContext,
  changeDir: string,
  handoff: ProductHandoff,
  completedTasks: string[],
  errors: string[]
): ArtifactUpdateSummary {
  const targetReqs = resolveTargetRequirements(handoff, changeDir);
  const targetUcs = collectTargetUseCases(handoff, changeDir);
  const createdArtifacts = materializeNewCatalogArtifacts(changeDir, ctx.rootDir, ctx.changeId, ctx.author, ctx.date, errors);
  const canonicalArtifacts = loadCanonicalArtifacts(ctx.rootDir);
  const specContent = ctx.syncContent ? readChangeSpecContent(changeDir) : undefined;
  const productIds = Array.from(new Set([...targetReqs, ...targetUcs]));
  const reqRes = updateRequirementsArtifacts(productIds, createdArtifacts, canonicalArtifacts, completedTasks, ctx, errors, specContent);
  const updatedArch = syncArchitectureArtifacts(handoff, canonicalArtifacts, targetReqs, targetUcs, changeDir, ctx, errors);
  return { targetReqs, updatedProduct: reqRes.updated, updatedArch, createdArtifacts, syncedContent: reqRes.syncedContent };
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
  const syncRes = syncPdacDigests({ rootDir: ctx.rootDir });

  return buildIntegrationSuccessPayload(
    ctx.changeId,
    tasksRes!,
    updates,
    archiveRes,
    syncRes.syncedCount,
    errors
  );
}

function listDirectorySubfolders(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort(canonicalSort);
}

function collectBatchCandidateChanges(
  rootDir: string,
  includeCompleted: boolean
): Array<{ changeId: string; dir: string; isCompletedDir: boolean }> {
  const candidates: Array<{ changeId: string; dir: string; isCompletedDir: boolean }> = [];
  if (includeCompleted) {
    const compParent = path.join(rootDir, 'specs', 'changes', 'completed');
    for (const name of listDirectorySubfolders(compParent)) {
      candidates.push({ changeId: name, dir: path.join(compParent, name), isCompletedDir: true });
    }
  }
  const activeParent = path.join(rootDir, 'specs', 'changes', 'active');
  for (const name of listDirectorySubfolders(activeParent)) {
    candidates.push({ changeId: name, dir: path.join(activeParent, name), isCompletedDir: false });
  }
  return candidates;
}

function shouldSkipBatchCandidate(
  candidate: { changeId: string; dir: string; isCompletedDir: boolean }
): string | null {
  const handoff = resolveChangeHandoff(candidate.dir, candidate.changeId);
  if (!handoff || !handoff.subgraph) {
    return 'Sin sidecar handoff.yaml ni citaciones en proposal.md';
  }
  const tasksCheck = checkTasksExecution(candidate.dir, candidate.changeId);
  if (!tasksCheck.ok) {
    return `Tareas pendientes (${tasksCheck.pendingTasks.join(', ')})`;
  }
  return null;
}

interface BatchAccumulator {
  processedChanges: string[];
  skippedChanges: Array<{ changeId: string; reason: string }>;
  results: SddIntegrationResult[];
  updatedProduct: Set<string>;
  updatedArch: Set<string>;
  createdCanonical: Set<string>;
  errors: string[];
}

function recordBatchResult(acc: BatchAccumulator, changeId: string, res: SddIntegrationResult): void {
  acc.results.push(res);
  if (!res.success) {
    acc.errors.push(...res.errors);
    return;
  }
  acc.processedChanges.push(changeId);
  for (const p of res.updatedProductArtifacts) acc.updatedProduct.add(p);
  for (const a of res.updatedArchitectureArtifacts) acc.updatedArch.add(a);
  for (const c of res.createdCanonicalArtifacts || []) acc.createdCanonical.add(c);
}

function createBatchAccumulator(): BatchAccumulator {
  return {
    processedChanges: [],
    skippedChanges: [],
    results: [],
    updatedProduct: new Set(),
    updatedArch: new Set(),
    createdCanonical: new Set(),
    errors: [],
  };
}

function processSingleBatchCandidate(
  cand: { changeId: string; dir: string; isCompletedDir: boolean },
  rootDir: string,
  options: SddIntegrateAllOptions,
  acc: BatchAccumulator
): void {
  const skipReason = shouldSkipBatchCandidate(cand);
  if (skipReason) {
    acc.skippedChanges.push({ changeId: cand.changeId, reason: skipReason });
    return;
  }
  const res = integrateSddChange({
    rootDir,
    changeId: cand.changeId,
    author: options.author,
    date: options.date,
    autoArchive: cand.isCompletedDir ? false : options.autoArchive,
    syncContent: options.syncContent,
  });
  recordBatchResult(acc, cand.changeId, res);
}

function finalizeBatchResult(acc: BatchAccumulator, syncedDigestsCount: number): SddIntegrateAllResult {
  return {
    success: acc.errors.length === 0,
    processedChanges: acc.processedChanges,
    skippedChanges: acc.skippedChanges,
    results: acc.results,
    updatedProductArtifacts: Array.from(acc.updatedProduct),
    updatedArchitectureArtifacts: Array.from(acc.updatedArch),
    createdCanonicalArtifacts: Array.from(acc.createdCanonical),
    syncedDigestsCount,
    errors: acc.errors,
  };
}

export function integrateAllSddChanges(options: SddIntegrateAllOptions = {}): SddIntegrateAllResult {
  const rootDir = options.rootDir || process.cwd();
  const candidates = collectBatchCandidateChanges(rootDir, options.includeCompleted !== false);
  const acc = createBatchAccumulator();
  for (const cand of candidates) {
    processSingleBatchCandidate(cand, rootDir, options, acc);
  }
  const finalSync = syncPdacDigests({ rootDir });
  return finalizeBatchResult(acc, finalSync.syncedCount);
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
